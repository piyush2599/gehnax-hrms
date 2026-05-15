import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({
          email: credentials.email,
          isActive: true,
        }).select("+password mfaEnabled mfaSkipCount mfaDisabledUntil mfaForceSetup");

        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) return null;

        // Record last login (fire-and-forget)
        User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).exec().catch(() => {});

        // Temp disable: treat mfaEnabled as false if admin disabled it until a future date
        const now = new Date();
        const tempDisabled = user.mfaEnabled &&
          user.mfaDisabledUntil instanceof Date &&
          user.mfaDisabledUntil > now;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          employeeId: user.employeeId?.toString(),
          avatar: user.avatar,
          mfaEnabled:    user.mfaEnabled && !tempDisabled,
          mfaSkipCount:  user.mfaSkipCount,
          mfaForceSetup: user.mfaForceSetup && !user.mfaEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign-in — populate token from the authorized user object
      if (user) {
        token.role        = (user as any).role;
        token.employeeId  = (user as any).employeeId;
        token.avatar      = (user as any).avatar;
        // MFA state — only set on initial sign-in, never re-set on refresh
        const mfaEnabled    = !!(user as any).mfaEnabled;
        const skipCount     = (user as any).mfaSkipCount ?? 0;
        const mfaForceSetup = !!(user as any).mfaForceSetup;
        token.mfaPending        = mfaEnabled;
        token.mfaSetupRequired  = !mfaEnabled;
        token.mfaSetupMandatory = !mfaEnabled && (skipCount >= 5 || mfaForceSetup);
        // loginAt (ms) is used to determine whether MFA actions happened in this session
        token.loginAt = Date.now();
        return token;
      }

      // On explicit session update or periodic refresh — only UPDATE (never re-set) MFA flags
      if (trigger === "update" || !token.role) {
        await connectDB();
        const dbUser = await User.findById(token.sub).select(
          "name role employeeId avatar isActive mfaEnabled mfaVerifiedAt mfaSkippedAt"
        );
        if (dbUser) {
          if (dbUser.name) token.name = dbUser.name;
          token.role       = dbUser.role;
          token.employeeId = dbUser.employeeId?.toString();
          token.avatar     = dbUser.avatar;

          const loginAt = (token.loginAt as number) ?? 0;

          // Clear mfaPending if MFA was verified during this login session
          if (token.mfaPending && dbUser.mfaVerifiedAt) {
            if (new Date(dbUser.mfaVerifiedAt).getTime() >= loginAt) {
              token.mfaPending = false;
            }
          }

          // Clear mfaSetupRequired if MFA is now enabled in DB
          if (token.mfaSetupRequired && dbUser.mfaEnabled) {
            token.mfaSetupRequired  = false;
            token.mfaSetupMandatory = false;
          }

          // Clear mfaSetupRequired if setup was skipped during this login session
          if (token.mfaSetupRequired && !token.mfaSetupMandatory && dbUser.mfaSkippedAt) {
            if (new Date(dbUser.mfaSkippedAt).getTime() >= loginAt) {
              token.mfaSetupRequired = false;
            }
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.name  = (token.name  as string) ?? session.user.name;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.id = token.sub!;
        (session.user as any).role = token.role;
        (session.user as any).employeeId = token.employeeId;
        (session.user as any).avatar = token.avatar;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge:    8 * 60 * 60, // 8 hours
    updateAge: 1 * 60 * 60, // refresh token from DB every hour (picks up role changes)
  },
  secret: process.env.NEXTAUTH_SECRET,
});
