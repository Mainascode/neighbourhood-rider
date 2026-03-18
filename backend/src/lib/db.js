import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  throw new Error("Missing MONGO_URI or MONGODB_URI");
}

const globalForMongoose = globalThis;

if (!globalForMongoose.__mongoose) {
  globalForMongoose.__mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (globalForMongoose.__mongoose.conn) {
    return globalForMongoose.__mongoose.conn;
  }

  if (!globalForMongoose.__mongoose.promise) {
    globalForMongoose.__mongoose.promise = mongoose.connect(MONGO_URI, {
      bufferCommands: false,
    });
  }

  globalForMongoose.__mongoose.conn = await globalForMongoose.__mongoose.promise;
  return globalForMongoose.__mongoose.conn;
}

export default connectDB;
