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
