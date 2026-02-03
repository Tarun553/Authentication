import express from "express";
import cookieParser from "cookie-parser";
import userRoutes from "./app/user/user.routes.ts";
import { errorHandler } from "./app/middleware/error.middleware.ts";
import { requestLogger } from "./app/middleware/logger.middleware.ts";
import { connectDB } from "./common/db.ts";
import type { Request, Response } from "express";

export async function createServer() {
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestLogger);

  app.use(userRoutes);

  app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

  app.use(errorHandler);

  return app;
}
