import { User } from "../validations/user.model.ts";
import { sha256 } from "../../../common/crypto.ts";
import type { UserDocShape } from "../validations/user.types.ts";
import type { Document } from "mongoose";

type UserDocument = Document & UserDocShape;

export class UserRepository {
  static async findByEmail(email: string) {
    return User.findOne({ email: email.toLowerCase() });
  }

  static async findById(id: string) {
    return User.findById(id);
  }

  static async findByEmailVerifyToken(token: string) {
    const tokenHash = sha256(token);
    return User.findOne({
      emailVerifyTokenHash: tokenHash,
      emailVerifyExpires: { $gt: new Date() },
    });
  }

  static async findByPasswordResetToken(token: string) {
    const tokenHash = sha256(token);
    return User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
      provider: "local",
    });
  }

  static async create(data: Partial<UserDocShape>) {
    return User.create(data);
  }

  static async updateRefreshToken(userId: string, tokenHash: string | undefined) {
    return User.updateOne({ _id: userId }, { refreshTokenHash: tokenHash });
  }

  static async save(user: UserDocument) {
    return user.save();
  }
}
