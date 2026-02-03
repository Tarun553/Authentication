export interface RegisterDto {
    email: string;
    password: string;
    name?: string;
  }
  
  export interface LoginDto {
    email: string;
    password: string;
  }
  
  export interface ForgotPasswordDto {
    email: string;
  }
  
  export interface ResetPasswordDto {
    token: string;
    newPassword: string;
  }
  
  export interface ResendVerificationDto {
    email: string;
  }
  
  export interface GoogleLoginInput {
    email: string;
    googleId: string;
    name?: string;
    picture?: string;
    emailVerified: boolean;
  }
  
  export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
  }
  