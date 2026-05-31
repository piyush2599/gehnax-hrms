import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "candidate-fallback-secret"
);
export const CANDIDATE_COOKIE = "candidate-session";

export async function signCandidateToken(payload: { id: string; email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyCandidateToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET);
  return payload as { id: string; email: string };
}

/** Read and verify candidate session from server-component cookies(). */
export async function getCandidateSession() {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get(CANDIDATE_COOKIE)?.value;
    if (!token) return null;
    return await verifyCandidateToken(token);
  } catch {
    return null;
  }
}

/** Read and verify candidate session from an API route request. */
export async function getCandidateSessionFromRequest(req: NextRequest) {
  try {
    const token = req.cookies.get(CANDIDATE_COOKIE)?.value;
    if (!token) return null;
    return await verifyCandidateToken(token);
  } catch {
    return null;
  }
}
