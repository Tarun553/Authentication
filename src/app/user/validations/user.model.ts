import { Schema, model } from "mongoose";
import type { UserDocShape } from "./user.types.ts";

const userSchema = new Schema<UserDocShape>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String },
    picture: { type: String },

    provider: { type: String, enum: ["local", "google"], required: true, default: "local" },

    passwordHash: { type: String }, // only for local
    googleId: { type: String, sparse: true },

    emailVerified: { type: Boolean, default: false },

    emailVerifyTokenHash: { type: String },
    emailVerifyExpires: { type: Date },

    resetPasswordTokenHash: { type: String },
    resetPasswordExpires: { type: Date },

    refreshTokenHash: { type: String },
  },
  { timestamps: true }
);

// Helpful indexes
// Note: email index is created automatically by `unique: true` on the field
userSchema.index({ googleId: 1 }, { sparse: true });

export const User = model<UserDocShape>("User", userSchema);
