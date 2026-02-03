import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../common/config.ts";
import { UnauthorizedError } from "../../common/errors.ts";

export interface AuthRequest extends Request {
  user?: {
    sub: string;
    email: string;
  };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);
    
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; email: string };
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}
