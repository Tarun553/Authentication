import mongoose from "mongoose";
import { env } from "./config.ts";

export async function connectDB(): Promise<void> {
  const uri = env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set. Add it to your .env file.");
  }
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
