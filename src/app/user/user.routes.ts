import { Router } from "express";
import { AuthController } from "./controller/auth.controller.ts";
import { validate } from "../middleware/validate.middleware.ts";
import {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./validations/auth.validation.ts";

const router = Router();

// local auth
router.post("/auth/register", validate(registerSchema), AuthController.register);
router.post("/auth/login", validate(loginSchema), AuthController.login);
router.post("/auth/refresh", AuthController.refresh);
router.post("/auth/logout", AuthController.logout);

// email verification
router.get("/auth/verify-email", AuthController.verifyEmail);
router.post("/auth/resend-verification", validate(resendVerificationSchema), AuthController.resendVerification);

// reset password
router.post("/auth/forgot-password", validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post("/auth/reset-password", validate(resetPasswordSchema), AuthController.resetPassword);

// google (no passport)
router.get("/auth/google", AuthController.googleStart);
router.get("/auth/google/callback", AuthController.googleCallback);

export default router;
