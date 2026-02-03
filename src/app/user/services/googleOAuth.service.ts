import { env } from "../../../common/config.ts";
import { randomToken } from "../../../common/crypto.ts";

export function makeOAuthStateNonce() {
  return { state: randomToken(16), nonce: randomToken(16) };
}

export function buildGoogleAuthUrl(state: string, nonce: string) {
  const base = "https://accounts.google.com/o/oauth2/v2/auth";
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
    nonce,
  });
  return `${base}?${params.toString()}`;
}
