import { google } from "googleapis";
import { Readable } from "stream";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  const credentials = JSON.parse(key);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

export interface DriveUploadResult {
  url: string;
  fileId: string;
}

export async function uploadToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  subFolder = ""
): Promise<DriveUploadResult> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  // Resolve parent folder (create subfolder if needed)
  let parentId = FOLDER_ID;
  if (subFolder) {
    parentId = await ensureSubFolder(drive, subFolder, FOLDER_ID);
  }

  // Upload file
  const res = await drive.files.create({
    requestBody: {
      name: `${Date.now()}-${fileName}`,
      parents: [parentId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, name",
  });

  const fileId = res.data.id!;

  // Make file publicly readable
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  // Direct view URL — works for images and PDF preview
  const url = `https://drive.google.com/uc?export=view&id=${fileId}`;
  return { url, fileId };
}

async function ensureSubFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string
): Promise<string> {
  // Check if subfolder already exists
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
  });

  if (res.data.files?.length) {
    return res.data.files[0].id!;
  }

  // Create it
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  return folder.data.id!;
}
