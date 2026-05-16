import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function isPublic(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname === "/jobs" || pathname.startsWith("/jobs/")) return true;
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "onboarding" && parts.length === 2) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isSecure = req.url.startsWith("https://");
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName,
  });

  const isAuthenticated = !!token;

  if (isPublic(pathname)) {
    if (pathname === "/login" && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── MFA gate ──────────────────────────────────────────────────────────────
  // Short-lived cookie set by MFA API routes after success — acts as "MFA cleared
  // this session" pass, bypassing stale JWT MFA flags until the next token refresh.
  const mfaComplete = req.cookies.get("mfa-complete")?.value === "1";
  if (mfaComplete) {
    if (pathname.startsWith("/mfa/")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // fall through — still enforce mustChangePassword gate below
  } else {
    const mfaPending       = !!(token as any).mfaPending;
    const mfaSetupRequired = !!(token as any).mfaSetupRequired;

    if (mfaPending) {
      if (pathname !== "/mfa/verify") {
        return NextResponse.redirect(new URL("/mfa/verify", req.url));
      }
      return NextResponse.next();
    }

    if (mfaSetupRequired) {
      if (pathname !== "/mfa/setup") {
        return NextResponse.redirect(new URL("/mfa/setup", req.url));
      }
      return NextResponse.next();
    }

    // Redirect away from /mfa/* when MFA is not needed
    if (pathname.startsWith("/mfa/")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // ── Must-change-password gate ─────────────────────────────────────────────
  const mustChangePassword = !!(token as any).mustChangePassword;
  if (mustChangePassword) {
    if (pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }
    return NextResponse.next();
  }
  if (pathname === "/change-password") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox).*)",
  ],
};
