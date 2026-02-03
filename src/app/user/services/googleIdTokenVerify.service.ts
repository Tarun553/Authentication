import { OAuth2Client } from "google-auth-library";
import { env } from "../../../common/config.ts";
import { UnauthorizedError } from "../../../common/errors.ts";

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
  if (!payload) {
    throw new UnauthorizedError("Invalid Google ID token");
  }

  if (payload.nonce !== expectedNonce) {
    throw new UnauthorizedError("Invalid nonce");
  }
  
  if (!payload.email) {
    throw new UnauthorizedError("Google token missing email");
  }

  return payload as unknown as GoogleIdPayload;
}
