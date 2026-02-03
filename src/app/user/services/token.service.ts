import type { Response } from "express";
import { sha256 } from "../../../common/crypto.ts";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../../common/jwt.ts";
import { env } from "../../../common/config.ts";
import { UserRepository } from "../repositories/user.repository.ts";
import { UnauthorizedError } from "../../../common/errors.ts";
import { TOKEN_EXPIRY, COOKIE_NAMES } from "../../../common/constants.ts";

export class TokenService {
  static issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    return { accessToken, refreshToken };
  }

  static setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/auth/refresh",
      maxAge: TOKEN_EXPIRY.REFRESH_COOKIE,
    });
  }

  static clearRefreshCookie(res: Response) {
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: "/auth/refresh" });
  }

  static async storeRefreshTokenHash(userId: string, refreshToken: string) {
    await UserRepository.updateRefreshToken(userId, sha256(refreshToken));
  }

  static async rotateRefreshToken(incomingRefreshToken: string) {
    const payload = verifyRefreshToken(incomingRefreshToken);

    const user = await UserRepository.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedError();
    }

    if (sha256(incomingRefreshToken) !== user.refreshTokenHash) {
      // token reuse or stolen token
      user.refreshTokenHash = undefined;
      await UserRepository.save(user);
      throw new UnauthorizedError();
    }

    const { accessToken, refreshToken } = this.issueTokens(user._id.toString(), user.email);
    user.refreshTokenHash = sha256(refreshToken);
    await UserRepository.save(user);

    return { user, accessToken, refreshToken };
  }
}
