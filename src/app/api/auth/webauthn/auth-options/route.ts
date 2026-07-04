import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WebAuthnCredential from "@/models/WebAuthnCredential";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await connectDB();

  const credentials = await WebAuthnCredential.find({ userId });
  if (!credentials.length) {
    return NextResponse.json({ error: "No biometric credentials registered" }, { status: 404 });
  }

  const allowCredentials = credentials.map((c) => ({
    id:         new Uint8Array(Buffer.from(c.credentialId, "base64url")),
    type:       "public-key" as const,
    transports: c.transports as AuthenticatorTransport[],
  }));

  const options = await generateAuthenticationOptions({
    timeout:          60_000,
    allowCredentials,
    userVerification: "required",
    rpID:             getRpId(),
  });

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
