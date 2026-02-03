import type { Response } from "express";
import { sha256 } from "../../../common/crypto.ts";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../../common/jwt.ts";
import { env } from "../../../common/config.ts";
import { User } from "../validations/user.model.ts";

export class TokenService {
  static issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    return { accessToken, refreshToken };
  }

  static setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  static clearRefreshCookie(res: Response) {
    res.clearCookie("refresh_token", { path: "/auth/refresh" });
  }

  static async storeRefreshTokenHash(userId: string, refreshToken: string) {
    await User.updateOne({ _id: userId }, { refreshTokenHash: sha256(refreshToken) });
  }

  static async rotateRefreshToken(incomingRefreshToken: string) {
    const payload = verifyRefreshToken(incomingRefreshToken);

    const user = await User.findById(payload.sub);
    if (!user || !user.refreshTokenHash) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });

    if (sha256(incomingRefreshToken) !== user.refreshTokenHash) {
      // token reuse or stolen token
      user.refreshTokenHash = undefined;
      await user.save();
      throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    }

    const { accessToken, refreshToken } = this.issueTokens(user._id.toString(), user.email);
    user.refreshTokenHash = sha256(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
  }
}
