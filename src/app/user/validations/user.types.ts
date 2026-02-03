import type { Types } from "mongoose";

export type AuthProvider = "local" | "google";

export interface UserPublic {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: AuthProvider;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocShape {
  _id: Types.ObjectId;

  email: string;
  name?: string;
  picture?: string;

  provider: AuthProvider;

  // local auth
  passwordHash?: string;

  // google auth
  googleId?: string;

  emailVerified: boolean;

  // email verification
  emailVerifyTokenHash?: string;
  emailVerifyExpires?: Date;

  // reset password
  resetPasswordTokenHash?: string;
  resetPasswordExpires?: Date;

  // app refresh token (your own JWT refresh token, hashed)
  refreshTokenHash?: string;

  createdAt: Date;
  updatedAt: Date;
}
