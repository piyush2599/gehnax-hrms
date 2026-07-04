import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import WebAuthnCredential from "@/models/WebAuthnCredential";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import jwt from "jsonwebtoken";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const userId = (session.user as any).id as string;

  // Fetch existing credentials so the authenticator skips already-registered devices
  const existing = await WebAuthnCredential.find({ userId });
  const excludeCredentials = existing.map((c) => ({
    id: new Uint8Array(Buffer.from(c.credentialId, "base64url")),
    type: "public-key" as const,
    transports: c.transports as AuthenticatorTransportFuture[],
  }));

  const options = await generateRegistrationOptions({
    rpName:                  "Gehnax HRMS",
    rpID:                    getRpId(),
    userID:                  userId,
    userName:                session.user.email ?? userId,
    userDisplayName:         session.user.name ?? session.user.email ?? "User",
    timeout:                 60_000,
    attestationType:         "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey:        "preferred",
      userVerification:   "required",  // forces biometric
      authenticatorAttachment: "platform", // phone's built-in sensor only
    },
  });

  // Sign the challenge so we can verify it server-side without DB storage
  const challengeToken = jwt.sign(
    { challenge: options.challenge, userId },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: "5m" }
  );

  return NextResponse.json({ options, challengeToken });
}

function getRpId() {
  const url = process.env.NEXTAUTH_URL ?? "https://myapp.gehnax.com";
  try { return new URL(url).hostname; } catch { return "localhost"; }
}
