export interface AuthResponse {
  success: true;
  accessToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
    emailVerified: boolean;
  };
}

export interface SuccessResponse {
  success: true;
  message?: string;
}

export interface RefreshResponse {
  success: true;
  accessToken: string;
}
