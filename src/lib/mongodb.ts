import mongoose from "mongoose";
import "./models";

const isPlaceholder = (uri: string) =>
  uri.includes("<username>") || uri.includes("<password>") || uri.includes("xxxxx");

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };
if (!global.mongoose) global.mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  let MONGODB_URI = process.env.MONGODB_URI || "";

  // Use in-memory DB for local demo when no real URI configured
  if (!MONGODB_URI || isPlaceholder(MONGODB_URI)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MONGODB_URI must be set in production");
    }
    const { getDevMongoUri } = await import("./mongodb-dev");
    MONGODB_URI = await getDevMongoUri();
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4, // Force IPv4 to skip IPv6 DNS lookup delay
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
