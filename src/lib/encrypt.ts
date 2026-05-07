import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? "default-hrms-key-change-in-prod";
  // SHA-256 of the key string always gives a consistent 32-byte key
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptBuffer(buffer: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  // Prepend IV so we can decrypt later: [16 bytes IV][ciphertext]
  return Buffer.concat([iv, encrypted]);
}

export function decryptBuffer(buffer: Buffer): Buffer {
  const iv = buffer.subarray(0, IV_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
