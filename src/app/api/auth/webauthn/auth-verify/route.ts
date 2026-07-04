import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WebAuthnCredential from "@/models/WebAuthnCredential";
import User from "@/models/User";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { encode } from "next-auth/jwt";
import jwt from "jsonwebtoken";

const SESSION_DAYS = 15;
const COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

export async function POST(req: NextRequest) {
  const { response, challengeToken } = await req.json();

  // Verify challenge token
  let payload: any;
  try {
    payload = jwt.verify(challengeToken, process.env.NEXTAUTH_SECRET!);
  } catch {
    return NextResponse.json({ error: "Challenge expired. Please try again." }, { status: 400 });
  }

  const { userId } = payload;

  await connectDB();

  // Find the credential used
  const credentialIdFromResponse = response.id;
  const credential = await WebAuthnCredential.findOne({
    userId,
    credentialId: credentialIdFromResponse,
  });
  if (!credential) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  // Verify the authentication response
  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge:       payload.challenge,
      expectedOrigin:          getOrigin(),
      expectedRPID:            getRpId(),
      requireUserVerification: true,
      authenticator: {
        credentialID:        new Uint8Array(Buffer.from(credential.credentialId, "base64url")),
        credentialPublicKey: new Uint8Array(credential.publicKey),
        counter:             credential.counter,
        transports:          credential.transports as AuthenticatorTransportFuture[],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Biometric verification failed" }, { status: 401 });
  }

  // Update counter and lastAuthAt
  await WebAuthnCredential.findByIdAndUpdate(credential._id, {
    counter:   verification.authenticationInfo.newCounter,
    lastAuthAt: new Date(),
  });

  // Fetch user for session data
  const user = await User.findById(userId).select(
    "name email roles role employeeId avatar isActive rolesActive"
  );
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "User not found or inactive" }, { status: 403 });
  }

  const rolesActive = user.rolesActive !== false;
  const allRoles: string[] = user.roles?.length
    ? [...user.roles].map(String)
    : user.role ? [String(user.role)] : ["employee"];
  const roles = rolesActive ? allRoles : ["employee"];

  const maxAge = SESSION_DAYS * 24 * 60 * 60; // seconds

  // Create a NextAuth-compatible JWT (biometric session — MFA skipped)
  const token = await encode({
    token: {
      sub:                userId,
      name:               user.name,
      email:              user.email,
      roles,
      employeeId:         user.employeeId?.toString(),
      avatar:             user.avatar,
      isBiometric:        true,
      loginAt:            Date.now(),
      mfaPending:         false,
      mfaSetupRequired:   false,
      mfaSetupMandatory:  false,
      mustChangePassword: false,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    salt:   COOKIE_NAME,
    maxAge,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly:  true,
    sameSite:  "lax",
    secure:    process.env.NODE_ENV === "production",
    maxAge,
    path:      "/",
  });

  return res;
}

function getRpId() {
  const url = process.env.NEXTAUTH_URL ?? "https://myapp.gehnax.com";
  try { return new URL(url).hostname; } catch { return "localhost"; }
}

function getOrigin() {
  const url = process.env.NEXTAUTH_URL ?? "https://myapp.gehnax.com";
  return url.replace(/\/$/, "");
}
