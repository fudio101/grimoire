import { afterEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import {
  assertAuthSecret,
  createToken,
  validateCredentials,
  verifyToken,
} from "@/lib/auth";

// 32 chars exactly — the documented floor in getSecret().
const VALID_SECRET = "a".repeat(32);

afterEach(() => {
  delete process.env.AUTH_SECRET;
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
});

describe("assertAuthSecret", () => {
  it("throws when AUTH_SECRET is missing", () => {
    expect(() => assertAuthSecret()).toThrow("AUTH_SECRET is not set");
  });

  it("throws when AUTH_SECRET is shorter than 32 characters", () => {
    process.env.AUTH_SECRET = "a".repeat(31);
    expect(() => assertAuthSecret()).toThrow(/at least 32 characters/);
  });

  it("does not throw at exactly 32 characters (positive control)", () => {
    process.env.AUTH_SECRET = VALID_SECRET;
    expect(() => assertAuthSecret()).not.toThrow();
  });
});

describe("createToken / verifyToken", () => {
  it("round-trips a real token minted by createToken (positive control)", async () => {
    process.env.AUTH_SECRET = VALID_SECRET;
    const token = await createToken();
    await expect(verifyToken(token)).resolves.toEqual({ sub: "admin" });
  });

  it("rejects a token signed with the same secret but the wrong subject", async () => {
    process.env.AUTH_SECRET = VALID_SECRET;
    const forged = await new SignJWT({ sub: "someone-else" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(VALID_SECRET));

    await expect(verifyToken(forged)).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    process.env.AUTH_SECRET = VALID_SECRET;
    const wrongSecretToken = await new SignJWT({ sub: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("b".repeat(32)));

    await expect(verifyToken(wrongSecretToken)).resolves.toBeNull();
  });

  it("rejects garbage input rather than throwing", async () => {
    process.env.AUTH_SECRET = VALID_SECRET;
    await expect(verifyToken("not-a-jwt")).resolves.toBeNull();
  });
});

describe("validateCredentials", () => {
  it("accepts the exact configured username/password (positive control)", () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "correct-horse-battery-staple";
    expect(validateCredentials("admin", "correct-horse-battery-staple")).toBe(
      true
    );
  });

  it("rejects a wrong password of the same length", () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "correct-horse-battery-staple";
    expect(validateCredentials("admin", "wrong-horse-battery-staple!")).toBe(
      false
    );
  });

  it("rejects a wrong username", () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    expect(validateCredentials("not-admin", "secret")).toBe(false);
  });

  it("rejects a password of a different length without throwing", () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "short";
    expect(() =>
      validateCredentials("admin", "a-much-longer-guess")
    ).not.toThrow();
    expect(validateCredentials("admin", "a-much-longer-guess")).toBe(false);
  });
});
