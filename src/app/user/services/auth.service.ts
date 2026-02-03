import bcrypt from "bcryptjs";
import { randomToken, sha256 } from "../../../common/crypto.ts";
import { TokenService } from "./token.service.ts";
import { MailService } from "./mail.service.ts";
import { UserRepository } from "../repositories/user.repository.ts";
import { ConflictError, UnauthorizedError, ForbiddenError, BadRequestError } from "../../../common/errors.ts";
import { TOKEN_EXPIRY, BCRYPT_ROUNDS } from "../../../common/constants.ts";
import type { GoogleLoginInput, RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from "../dto/auth.dto.ts";
import type { UserDocShape } from "../validations/user.types.ts";

export class AuthService {
  // Helper methods
  private static async generateEmailVerificationToken(user: UserDocShape) {
    const verifyToken = randomToken(32);
    user.emailVerifyTokenHash = sha256(verifyToken);
    user.emailVerifyExpires = new Date(Date.now() + TOKEN_EXPIRY.EMAIL_VERIFY);
    await UserRepository.save(user);
    return verifyToken;
  }

  private static async generatePasswordResetToken(user: UserDocShape) {
    const resetToken = randomToken(32);
    user.resetPasswordTokenHash = sha256(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET);
    await UserRepository.save(user);
    return resetToken;
  }

  private static async createLocalUser(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    
    return UserRepository.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      provider: "local",
      passwordHash,
      emailVerified: false,
    });
  }

  private static issueAuthTokens(user: UserDocShape) {
    const { accessToken, refreshToken } = TokenService.issueTokens(user._id.toString(), user.email);
    return { accessToken, refreshToken };
  }

  private static async checkEmailExists(email: string) {
    const exists = await UserRepository.findByEmail(email);
    if (exists) {
      throw new ConflictError("Email already in use");
    }
  }

  // ---------- Local Register ----------
  static async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    await this.checkEmailExists(email);

    const user = await this.createLocalUser(dto);

    const verifyToken = await this.generateEmailVerificationToken(user);
    await MailService.sendVerifyEmail(user.email, verifyToken);

    const { accessToken, refreshToken } = this.issueAuthTokens(user);
    await TokenService.storeRefreshTokenHash(user._id.toString(), refreshToken);

    return { user, accessToken, refreshToken };
  }

  // ---------- Local Login ----------
  static async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await UserRepository.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.emailVerified) {
      throw new ForbiddenError("Email not verified");
    }

    const { accessToken, refreshToken } = this.issueAuthTokens(user);
    await TokenService.storeRefreshTokenHash(user._id.toString(), refreshToken);

    return { user, accessToken, refreshToken };
  }

  // ---------- Verify Email ----------
  static async verifyEmail(token: string) {
    const user = await UserRepository.findByEmailVerifyToken(token);

    if (!user) {
      throw new BadRequestError("Invalid or expired token");
    }

    user.emailVerified = true;
    user.emailVerifyTokenHash = undefined;
    user.emailVerifyExpires = undefined;
    await UserRepository.save(user);

    return user;
  }

  static async resendVerification(email: string) {
    const user = await UserRepository.findByEmail(email);
    if (!user) return;
    if (user.emailVerified) return;

    const verifyToken = await this.generateEmailVerificationToken(user);
    await MailService.sendVerifyEmail(user.email, verifyToken);
  }

  // ---------- Forgot Password ----------
  static async forgotPassword(dto: ForgotPasswordDto) {
    const user = await UserRepository.findByEmail(dto.email.toLowerCase());
    if (!user || user.provider !== "local") return;

    const resetToken = await this.generatePasswordResetToken(user);
    await MailService.sendResetPassword(user.email, resetToken);
  }

  // ---------- Reset Password ----------
  static async resetPassword(dto: ResetPasswordDto) {
    const user = await UserRepository.findByPasswordResetToken(dto.token);

    if (!user) {
      throw new BadRequestError("Invalid or expired token");
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;

    // revoke refresh token on password reset
    user.refreshTokenHash = undefined;
    await UserRepository.save(user);

    return user;
  }

  // ---------- Google Login ----------
  static async loginWithGoogle(input: GoogleLoginInput) {
    const email = input.email.toLowerCase();

    let user = await UserRepository.findByEmail(email);
    if (!user) {
      user = await UserRepository.create({
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
      await UserRepository.save(user);
    }

    const { accessToken, refreshToken } = this.issueAuthTokens(user);
    await TokenService.storeRefreshTokenHash(user._id.toString(), refreshToken);

    return { user, accessToken, refreshToken };
  }

  // ---------- Logout ----------
  static async logout(userId: string) {
    await UserRepository.updateRefreshToken(userId, undefined);
  }
}
