import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import WebAuthnCredential from "@/models/WebAuthnCredential";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { response, challengeToken } = await req.json();

  // Verify challenge token
  let payload: any;
  try {
    payload = jwt.verify(challengeToken, process.env.NEXTAUTH_SECRET!);
  } catch {
    return NextResponse.json({ error: "Challenge expired. Please try again." }, { status: 400 });
  }

  const userId = (session.user as any).id as string;
  if (payload.userId !== userId) {
    return NextResponse.json({ error: "Challenge mismatch" }, { status: 400 });
  }

  const origin = getOrigin();
  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: payload.challenge,
      expectedOrigin:    origin,
      expectedRPID:      getRpId(),
      requireUserVerification: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
  // credentialID is a Uint8Array in v9 — convert to base64url string for storage
  const credentialIdStr = Buffer.from(credentialID).toString("base64url");

  await connectDB();

  // Upsert: if they already have a credential on this device, replace it
  await WebAuthnCredential.findOneAndUpdate(
    { userId, credentialId: credentialIdStr },
    {
      userId,
      credentialId: credentialIdStr,
      publicKey:    Buffer.from(credentialPublicKey),
      counter,
      transports:   response.response?.transports ?? [],
      lastAuthAt:   new Date(),
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}

function getRpId() {
  const url = process.env.NEXTAUTH_URL ?? "https://myapp.gehnax.com";
  try { return new URL(url).hostname; } catch { return "localhost"; }
}

function getOrigin() {
  const url = process.env.NEXTAUTH_URL ?? "https://myapp.gehnax.com";
  // Allow both www and non-www, handle trailing slashes
  return url.replace(/\/$/, "");
}
