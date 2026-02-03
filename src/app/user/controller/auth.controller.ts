import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.ts";
import { TokenService } from "../services/token.service.ts";

import { makeOAuthStateNonce, buildGoogleAuthUrl } from "../services/googleOAuth.service.ts";
import { exchangeCodeForTokens } from "../services/googleTokenExchange.service.ts";
import { verifyGoogleIdToken } from "../services/googleIdTokenVerify.service.ts";

const OAUTH_COOKIE = "g_oauth";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.register(req.body);
      TokenService.setRefreshCookie(res, refreshToken);
      res.status(201).json({ success: true, accessToken, user: { id: user._id.toString(), email: user.email } });
    } catch (e) {
      next(e);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(req.body);
      TokenService.setRefreshCookie(res, refreshToken);
      res.json({ success: true, accessToken, user: { id: user._id.toString(), email: user.email } });
    } catch (e) {
      next(e);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const incoming = req.cookies?.refresh_token;
      if (!incoming) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });

      const { accessToken, refreshToken } = await TokenService.rotateRefreshToken(incoming);
      TokenService.setRefreshCookie(res, refreshToken);

      res.json({ success: true, accessToken });
    } catch (e) {
      next(e);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const incoming = req.cookies?.refresh_token;
      if (incoming) {
        // rotation logic already checks hash; here just clear cookie and revoke DB hash via userId if you track it
      }
      TokenService.clearRefreshCookie(res);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      // Express auto-decodes query params, but ensure we handle it properly
      const rawToken = req.query.token;
      if (!rawToken || typeof rawToken !== "string") {
        throw Object.assign(new Error("Missing token"), { statusCode: 400 });
      }
      // Trim whitespace and decode if needed (Express should already decode, but be safe)
      const token = decodeURIComponent(rawToken).trim();
      if (!token) throw Object.assign(new Error("Missing token"), { statusCode: 400 });
      await AuthService.verifyEmail(token);
      res.json({ success: true, message: "Email verified" });
    } catch (e) {
      next(e);
    }
  }

  static async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.resendVerification(req.body.email);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.forgotPassword(req.body);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.resetPassword(req.body);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  // ---------- Google OAuth (no passport) ----------
  static async googleStart(_req: Request, res: Response) {
    const { state, nonce } = makeOAuthStateNonce();
    res.cookie(OAUTH_COOKIE, JSON.stringify({ state, nonce }), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(buildGoogleAuthUrl(state, nonce));
  }

  static async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const code = String(req.query.code || "");
      const state = String(req.query.state || "");
      if (!code || !state) throw Object.assign(new Error("Missing code/state"), { statusCode: 400 });

      const raw = req.cookies?.[OAUTH_COOKIE];
      if (!raw) throw Object.assign(new Error("Missing OAuth cookie"), { statusCode: 401 });

      const { state: expectedState, nonce } = JSON.parse(raw) as { state: string; nonce: string };
      if (state !== expectedState) throw Object.assign(new Error("Invalid state"), { statusCode: 401 });

      res.clearCookie(OAUTH_COOKIE);

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
      res.json({ success: true, accessToken });
    } catch (e) {
      next(e);
    }
  }
}
