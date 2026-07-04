import mongoose, { Schema, Document } from "mongoose";

export interface IWebAuthnCredential extends Document {
  userId:       mongoose.Types.ObjectId;
  credentialId: string;   // base64url
  publicKey:    Buffer;   // COSE-encoded public key bytes
  counter:      number;
  transports:   string[];
  createdAt:    Date;
  lastAuthAt:   Date;
}

const WebAuthnCredentialSchema = new Schema<IWebAuthnCredential>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    credentialId: { type: String, required: true, unique: true },
    publicKey:    { type: Buffer, required: true },
    counter:      { type: Number, required: true, default: 0 },
    transports:   [{ type: String }],
    lastAuthAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.WebAuthnCredential ||
  mongoose.model<IWebAuthnCredential>("WebAuthnCredential", WebAuthnCredentialSchema);
