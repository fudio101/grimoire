import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "session";

/**
 * HS256 keys the length of the digest or longer; anything shorter is brute
 * forceable offline against a single captured cookie. The 32-char floor is what
 * .env.example and CLAUDE.md have always documented — this enforces it.
 */
const MIN_SECRET_LENGTH = 32;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters (got ${secret.length})`
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Force the AUTH_SECRET checks above to run now rather than on the first login.
 *
 * `getSecret` is lazy, so without this a server misconfigured with a weak or
 * missing secret boots clean and only fails later, at a request — which reads
 * as a login bug rather than a deployment one. Called from src/server.ts beside
 * the migrations, the other thing that has to be right before traffic arrives.
 */
export function assertAuthSecret(): void {
  getSecret();
}

/** The only subject this app ever issues, and the only one it accepts. */
const ADMIN_SUBJECT = "admin";

export async function createToken(): Promise<string> {
  return new SignJWT({ sub: ADMIN_SUBJECT })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(
  token: string
): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // A valid signature only proves the token was minted with AUTH_SECRET, not
    // that it was minted by createToken. Checking the claim keeps this honest
    // if that secret is ever reused for a second kind of token.
    if (payload.sub !== ADMIN_SUBJECT) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export function validateCredentials(
  username: string,
  password: string
): boolean {
  return (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  );
}
