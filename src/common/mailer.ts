import nodemailer from "nodemailer";
import { env } from "./config.ts";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export async function sendMail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to,
    subject,
    html,
  });
}
