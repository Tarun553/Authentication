export const env = {
    PORT: Number(process.env.PORT || 3000),
    MONGO_URI: process.env.MONGO_URI!,
  
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || "15m",
    REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || "7d",
  
    APP_URL: process.env.APP_URL || "http://localhost:3000",
  
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL!,
  
    COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  
    SMTP_HOST: process.env.SMTP_HOST!,
    SMTP_PORT: Number(process.env.SMTP_PORT || 587),
    SMTP_USER: process.env.SMTP_USER!,
    SMTP_PASS: process.env.SMTP_PASS!,
    MAIL_FROM: process.env.MAIL_FROM || "no-reply@example.com",
  };
  