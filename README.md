# Testing Auth API with Postman

## Import the collection

1. Open Postman.
2. **Import** → **Upload Files** → select `Auth-API.postman_collection.json`.
3. The collection **Auth API** appears with variable `baseUrl` = `http://localhost:3000`. Change it if your server runs elsewhere.

## Run the server

```bash
npm run dev
```

## Testing order (recommended)

### 1. Health check
- **Health** (GET) → should return `{ "ok": true }`.

### 2. Local auth
- **Auth - Register** → body: `email`, `password` (8–100 chars), optional `name`. Saves `refresh_token` in a cookie.
- **Auth - Verify Email** → GET with `?token=...` from the verification email link (or skip if you handle verification differently).
- **Auth - Login** → same email/password. Returns `accessToken` and sets `refresh_token` cookie.
- **Auth - Refresh** → POST with no body. Must send the `refresh_token` cookie (see below).
- **Auth - Logout** → clears the cookie.

### 3. Password reset
- **Auth - Forgot Password** → body: `{ "email": "test@example.com" }`.
- **Auth - Reset Password** → body: `{ "token": "<from email>", "newPassword": "newpassword123" }`.

### 4. Refresh token and cookies in Postman

The app sets an HTTP-only cookie `refresh_token` on login/register. For **Auth - Refresh** to work in Postman:

- **Option A:** In Postman, go to **Settings** → **General** → turn **ON** “Send cookies with requests”. After **Login** or **Register**, the cookie is stored; **Refresh** will then send it.
- **Option B:** Use the **Cookies** link under the request URL and ensure the domain is `localhost` and the cookie is present after a successful login.

## Testing Google Auth

Google OAuth is a **browser redirect flow**, so you don’t run the full flow inside Postman.

1. **Start the flow in the browser**  
   Open:
   ```text
   http://localhost:3000/auth/google
   ```
2. You are redirected to Google to sign in.
3. After consent, Google redirects to:
   ```text
   http://localhost:3000/auth/google/callback?code=...&state=...
   ```
4. The app uses the `code` and the OAuth cookie, then responds with **JSON** containing `accessToken` (and sets the refresh cookie).

So for Google:

- Use the **browser** for: `GET http://localhost:3000/auth/google` and the callback.
- The collection request **“Google OAuth - Start (open in browser)”** is there to remind you of the URL; you can open that URL in the browser to test.

**Note:** For the callback to work, in Google Cloud Console the redirect URI must be exactly:
`http://localhost:3000/auth/google/callback` (for local testing).

## Using the access token

After **Login**, **Register**, or **Google callback**, you get an `accessToken`. For any future protected endpoints:

- Add header: **Authorization**: `Bearer <accessToken>`.

This collection does not include protected routes; add them and use the same header when you implement them.

---

## Code Architecture & Patterns

This codebase follows modern Node.js/TypeScript best practices for improved maintainability and scalability.

### 📁 Project Structure

```
src/
├── common/                  # Shared utilities and configuration
│   ├── constants.ts         # Application-wide constants (TOKEN_EXPIRY, HTTP_STATUS, etc.)
│   ├── errors.ts            # Custom error classes (AppError, UnauthorizedError, etc.)
│   ├── config.ts            # Environment validation with Zod
│   ├── crypto.ts            # Cryptographic utilities
│   ├── jwt.ts               # JWT token operations
│   ├── db.ts                # Database connection
│   └── mailer.ts            # Email service configuration
├── app/
│   ├── middleware/
│   │   ├── error.middleware.ts    # Global error handler
│   │   ├── logger.middleware.ts   # Request logging
│   │   ├── auth.middleware.ts     # JWT authentication
│   │   └── validate.middleware.ts # Request validation
│   └── user/
│       ├── controller/
│       │   └── auth.controller.ts # HTTP request handlers
│       ├── services/
│       │   ├── auth.service.ts    # Business logic
│       │   ├── token.service.ts   # Token management
│       │   ├── mail.service.ts    # Email operations
│       │   └── google*.service.ts # Google OAuth services
│       ├── repositories/
│       │   └── user.repository.ts # Database operations
│       ├── dto/
│       │   ├── auth.dto.ts        # Request DTOs
│       │   └── response.dto.ts    # Response DTOs
│       ├── validations/
│       │   ├── user.model.ts      # Mongoose model
│       │   └── user.types.ts      # TypeScript types
│       └── user.routes.ts         # Route definitions
└── server.ts                # Express app setup
```

### 🎯 Key Design Patterns

#### 1. **Repository Pattern**
Database operations are abstracted into the `UserRepository` class:
- Centralized data access logic
- Easy to test and mock
- Consistent query patterns

```typescript
// Instead of: User.findOne({ email })
// Use: UserRepository.findByEmail(email)
```

#### 2. **Custom Error Classes**
Type-safe error handling with proper HTTP status codes:
```typescript
throw new UnauthorizedError();           // 401
throw new BadRequestError("message");    // 400
throw new ConflictError("message");      // 409
throw new ForbiddenError("message");     // 403
```

#### 3. **Constants File**
All magic numbers and repeated values centralized:
```typescript
TOKEN_EXPIRY.EMAIL_VERIFY     // 1 hour
TOKEN_EXPIRY.PASSWORD_RESET   // 30 minutes
BCRYPT_ROUNDS                 // 10
COOKIE_NAMES.REFRESH_TOKEN    // "refresh_token"
```

#### 4. **Environment Validation**
Zod schema validates environment variables on startup:
- Fails fast with clear error messages
- Type-safe configuration access
- Default values for optional settings

#### 5. **Service Layer**
Business logic separated from HTTP handling:
- `AuthService`: User authentication operations
- `TokenService`: JWT token management
- `MailService`: Email notifications

#### 6. **DTOs (Data Transfer Objects)**
Type-safe request and response interfaces:
- Clear API contracts
- Better IDE support
- Runtime validation with Zod

### 🔒 Security Features

- **Environment validation** catches misconfigurations early
- **Custom error classes** prevent information leakage
- **Repository pattern** helps prevent SQL injection
- **HTTP-only cookies** for refresh tokens
- **Token rotation** on refresh
- **Password hashing** with bcrypt
- **Email verification** for new accounts
- **Secure password reset** flow

### 🛠 Benefits

1. **Readability**: Named constants and small focused functions
2. **Maintainability**: Changes isolated to specific layers
3. **Type Safety**: Strong TypeScript usage throughout
4. **Debugging**: Request logger tracks all HTTP requests
5. **Testability**: Repository pattern and service layer easy to test
6. **Consistency**: Uniform error handling and response patterns
7. **Security**: Environment validation and proper error handling

### 📝 Development Notes

- No functional API changes—all existing endpoints work as before
- Backward compatible with previous implementation
- Code quality improvements only
- Foundation for future enhancements (rate limiting, caching, etc.)
