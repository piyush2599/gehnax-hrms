/**
 * In-memory MongoDB for local development/demo (no Atlas needed)
 * Only used when MONGODB_URI is not set or contains placeholder
 */

let uri: string | null = null;

export async function getDevMongoUri(): Promise<string> {
  if (uri) return uri;

  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create();
  uri = mongod.getUri();
  console.log("[DEV] In-memory MongoDB started at:", uri);
  return uri;
}
