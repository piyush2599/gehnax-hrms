import * as ftp from "basic-ftp";
import { Readable } from "stream";

export interface FTPUploadResult {
  url: string;
  fileName: string;
}

export async function uploadToFTP(
  buffer: Buffer,
  originalName: string,
  subDir = ""
): Promise<FTPUploadResult> {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  const ext = originalName.split(".").pop() ?? "bin";
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;

  const uploadDir = process.env.FTP_UPLOAD_DIR ?? "/public_html/uploads/hiring";
  const targetDir = subDir ? `${uploadDir}/${subDir}` : uploadDir;
  const baseUrl = process.env.FTP_BASE_URL ?? "";
  const publicUrl = subDir
    ? `${baseUrl}/${subDir}/${fileName}`
    : `${baseUrl}/${fileName}`;

  try {
    await client.access({
      host:     process.env.FTP_HOST!,
      user:     process.env.FTP_USER!,
      password: process.env.FTP_PASS!,
      secure:   false,
    });

    // Ensure target directory exists
    await client.ensureDir(targetDir);

    // Upload from buffer via readable stream
    const stream = Readable.from(buffer);
    await client.uploadFrom(stream, fileName);
  } finally {
    client.close();
  }

  return { url: publicUrl, fileName };
}
