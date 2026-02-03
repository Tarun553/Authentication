import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.ts";
import { TokenService } from "../services/token.service.ts";
import { makeOAuthStateNonce, buildGoogleAuthUrl } from "../services/googleOAuth.service.ts";
import { exchangeCodeForTokens } from "../services/googleTokenExchange.service.ts";
import { verifyGoogleIdToken } from "../services/googleIdTokenVerify.service.ts";
import { BadRequestError, UnauthorizedError } from "../../../common/errors.ts";
import { HTTP_STATUS, TOKEN_EXPIRY, COOKIE_NAMES } from "../../../common/constants.ts";
import { env } from "../../../common/config.ts";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.register(req.body);
      TokenService.setRefreshCookie(res, refreshToken);
      res.status(HTTP_STATUS.CREATED).json({ 
        success: true, 
        accessToken, 
        user: { 
          id: user._id.toString(), 
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified
        } 
      });
    } catch (e) {
      next(e);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(req.body);
      TokenService.setRefreshCookie(res, refreshToken);
      res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        accessToken, 
        user: { 
          id: user._id.toString(), 
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified
        } 
      });
    } catch (e) {
      next(e);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const incoming = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
      if (!incoming) {
        throw new UnauthorizedError();
      }

      const { accessToken, refreshToken } = await TokenService.rotateRefreshToken(incoming);
      TokenService.setRefreshCookie(res, refreshToken);

      res.status(HTTP_STATUS.OK).json({ success: true, accessToken });
    } catch (e) {
      next(e);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const incoming = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
      if (incoming) {
        // Clear cookie and revoke token
      }
      TokenService.clearRefreshCookie(res);
      res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const rawToken = req.query.token;
      if (!rawToken || typeof rawToken !== "string") {
        throw new BadRequestError("Missing token");
      }
      
      const token = decodeURIComponent(rawToken).trim();
      if (!token) {
        throw new BadRequestError("Missing token");
      }
      
      await AuthService.verifyEmail(token);
      res.status(HTTP_STATUS.OK).json({ success: true, message: "Email verified" });
    } catch (e) {
      next(e);
    }
  }

  static async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.resendVerification(req.body.email);
      res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.forgotPassword(req.body);
      res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.resetPassword(req.body);
      res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  static async googleStart(_req: Request, res: Response) {
    const { state, nonce } = makeOAuthStateNonce();
    res.cookie(COOKIE_NAMES.OAUTH_STATE, JSON.stringify({ state, nonce }), {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      maxAge: TOKEN_EXPIRY.OAUTH_COOKIE,
    });
    res.redirect(buildGoogleAuthUrl(state, nonce));
  }

  static async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const code = String(req.query.code || "");
      const state = String(req.query.state || "");
      if (!code || !state) {
        throw new BadRequestError("Missing code/state");
      }

      const raw = req.cookies?.[COOKIE_NAMES.OAUTH_STATE];
      if (!raw) {
        throw new UnauthorizedError("Missing OAuth cookie");
      }

      const { state: expectedState, nonce } = JSON.parse(raw) as { state: string; nonce: string };
      if (state !== expectedState) {
        throw new UnauthorizedError("Invalid state");
      }

      res.clearCookie(COOKIE_NAMES.OAUTH_STATE);

      const tokens = await exchangeCodeForTokens(code);
      const payload = await verifyGoogleIdToken(tokens.id_token, nonce);

      const { accessToken, refreshToken } = await AuthService.loginWithGoogle({
        email: payload.email,
        googleId: payload.sub,
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified,
      });

      TokenService.setRefreshCookie(res, refreshToken);
      res.status(HTTP_STATUS.OK).json({ success: true, accessToken });
    } catch (e) {
      next(e);
    }
  }
}
