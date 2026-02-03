export const TOKEN_EXPIRY = {
  EMAIL_VERIFY: 60 * 60 * 1000, // 1 hour
  PASSWORD_RESET: 30 * 60 * 1000, // 30 minutes
  OAUTH_COOKIE: 10 * 60 * 1000, // 10 minutes
  REFRESH_COOKIE: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const BCRYPT_ROUNDS = 10;

export const COOKIE_NAMES = {
  REFRESH_TOKEN: "refresh_token",
  OAUTH_STATE: "g_oauth",
} as const;
