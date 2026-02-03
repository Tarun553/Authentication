import bcrypt from "bcryptjs";
import { User } from "../validations/user.model.ts";
import { randomToken, sha256 } from "../../../common/crypto.ts";
import { TokenService } from "./token.service.ts";
import { MailService } from "./mail.service.ts";
import type { GoogleLoginInput, RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from "../dto/auth.dto.ts";

export class AuthService {
  // ---------- Local Register ----------
  static async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const exists = await User.findOne({ email });
    if (exists) throw Object.assign(new Error("Email already in use"), { statusCode: 409 });

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await User.create({
      email,
      name: dto.name,
      provider: "local",
      passwordHash,
      emailVerified: false,
    });

    // create email verification token
    const verifyToken = randomToken(32);
    user.emailVerifyTokenHash = sha256(verifyToken);
    user.emailVerifyExpires = new Date(Date.now() + 1000 * 60 * 60); // 1h
    await user.save();

    await MailService.sendVerifyEmail(user.email, verifyToken);

    const { accessToken, refreshToken } = TokenService.issueTokens(user._id.toString(), user.email);
    await TokenService.storeRefreshTokenHash(user._id.toString(), refreshToken);

    return { user, accessToken, refreshToken };
  }

  // ---------- Local Login ----------
  static async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });

    // Optional: enforce verification
    if (!user.emailVerified) throw Object.assign(new Error("Email not verified"), { statusCode: 403 });

    const { accessToken, refreshToken } = TokenService.issueTokens(user._id.toString(), user.email);
    await TokenService.storeRefreshTokenHash(user._id.toString(), refreshToken);

    return { user, accessToken, refreshToken };
  }

  // ---------- Verify Email ----------
  static async verifyEmail(token: string) {
    const tokenHash = sha256(token);
    const user = await User.findOne({
      emailVerifyTokenHash: tokenHash,
      emailVerifyExpires: { $gt: new Date() },
    });

    if (!user) throw Object.assign(new Error("Invalid or expired token"), { statusCode: 400 });

    user.emailVerified = true;
    user.emailVerifyTokenHash = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    return user;
  }

  static async resendVerification(email: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return; // don't reveal existence
    if (user.emailVerified) return;

    const verifyToken = randomToken(32);
    user.emailVerifyTokenHash = sha256(verifyToken);
    user.emailVerifyExpires = new Date(Date.now() + 1000 * 60 * 60);
    await user.save();

    await MailService.sendVerifyEmail(user.email, verifyToken);
  }

  // ---------- Forgot Password ----------
  static async forgotPassword(dto: ForgotPasswordDto) {
    const user = await User.findOne({ email: dto.email.toLowerCase(), provider: "local" });
    if (!user) return;

    const resetToken = randomToken(32);
    user.resetPasswordTokenHash = sha256(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30); // 30m
    await user.save();

    await MailService.sendResetPassword(user.email, resetToken);
  }

  // ---------- Reset Password ----------
  static async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = sha256(dto.token);
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
      provider: "local",
    });

    if (!user) throw Object.assign(new Error("Invalid or expired token"), { statusCode: 400 });

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;

    // revoke refresh token on password reset
    user.refreshTokenHash = undefined;
    await user.save();

    return user;
  }

  // ---------- Google Login ----------
  static async loginWithGoogle(input: GoogleLoginInput) {
    const email = input.email.toLowerCase();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name: input.name,
        picture: input.picture,
        provider: "google",
        googleId: input.googleId,
        emailVerified: input.emailVerified || true,
      });
    } else {
      // link google
      user.googleId = user.googleId ?? input.googleId;
      user.provider = user.provider ?? "google";
      if (!user.emailVerified) user.emailVerified = input.emailVerified || true;
      if (!user.name && input.name) user.name = input.name;
      if (!user.picture && input.picture) user.picture = input.picture;
      await user.save();
    }

    const { accessToken, refreshToken } = TokenService.issueTokens(user._id.toString(), user.email);
    await TokenService.storeRefreshTokenHash(user._id.toString(), refreshToken);

    return { user, accessToken, refreshToken };
  }

  // ---------- Logout ----------
  static async logout(userId: string) {
    await User.updateOne({ _id: userId }, { refreshTokenHash: undefined });
  }
}
