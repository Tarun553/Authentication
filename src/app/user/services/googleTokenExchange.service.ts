import { env } from "../../../common/config.ts";

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  id_token: string;
  token_type: string;
  refresh_token?: string;
};

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    grant_type: "authorization_code",
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw Object.assign(new Error(`Google token exchange failed: ${text}`), { statusCode: 400 });
  }

  return (await resp.json()) as GoogleTokenResponse;
}
