import { env } from "../../../common/config.ts";
import { sendMail } from "../../../common/mailer.ts";

export class MailService {
  static async sendVerifyEmail(email: string, token: string) {
    const link = `${env.APP_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
    await sendMail(email, "Verify your email", `<p>Verify your email:</p><p><a href="${link}">${link}</a></p>`);
  }

  static async sendResetPassword(email: string, token: string) {
    const link = `${env.APP_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;
    await sendMail(email, "Reset your password", `<p>Reset your password:</p><p><a href="${link}">${link}</a></p>`);
  }
}
