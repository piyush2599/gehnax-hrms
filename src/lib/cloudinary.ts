import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "";

/**
 * Returns the auth-protected proxy URL for a Cloudinary document.
 * Works in both server and client contexts (no Node-only APIs).
 */
export function secureDocUrl(cloudinaryUrl: string): string {
  if (!cloudinaryUrl) return "";
  const encoded = typeof window === "undefined"
    ? Buffer.from(cloudinaryUrl).toString("base64url")
    : btoa(cloudinaryUrl).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `/api/secure-file?u=${encoded}`;
}

/** Returns true if the URL belongs to our Cloudinary account. */
export function isOurCloudinaryUrl(url: string): boolean {
  return url.startsWith(`https://res.cloudinary.com/${CLOUD_NAME}/`);
}

export async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  folder: string,
  mimeType: string
): Promise<CloudinaryUploadResult> {
  const resourceType = mimeType.startsWith("image/") ? "image" : "raw";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${Date.now()}-${fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        resource_type: resourceType,
        access_mode: "public",
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}
