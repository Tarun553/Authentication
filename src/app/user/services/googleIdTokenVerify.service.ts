import { OAuth2Client } from "google-auth-library";
import { env } from "../../../common/config.ts";

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export type GoogleIdPayload = {
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  sub: string;
  nonce?: string;
};

export async function verifyGoogleIdToken(idToken: string, expectedNonce: string) {
  const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload) throw Object.assign(new Error("Invalid Google ID token"), { statusCode: 401 });

  if (payload.nonce !== expectedNonce) throw Object.assign(new Error("Invalid nonce"), { statusCode: 401 });
  if (!payload.email) throw Object.assign(new Error("Google token missing email"), { statusCode: 401 });

  return payload as unknown as GoogleIdPayload;
}
