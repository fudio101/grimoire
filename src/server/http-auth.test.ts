import { afterEach, describe, expect, it, vi } from "vitest";
import { guardApiRequest } from "@/server/http-auth";
import { requireAuth, UnauthorizedError } from "@/server/auth-guard";

/**
 * `requireAuth` reads a real Next.js request context (`cookies()` from
 * `next/headers`), which doesn't exist outside an actual Next.js server
 * request. Mocking it here — rather than the module it comes from — keeps
 * these tests focused purely on `guardApiRequest`'s own logic (the origin
 * check, and how it reacts to an auth success/failure), with the real
 * `UnauthorizedError` class still in play so `instanceof` checks inside
 * `guardApiRequest` behave exactly as they do in production.
 */
vi.mock("@/server/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth-guard")>();
  return { ...actual, requireAuth: vi.fn() };
});

function makeRequest(headers: Record<string, string>): Request {
  return new Request("https://grimoire.example.com/api/purposes", {
    headers,
  });
}

afterEach(() => {
  vi.mocked(requireAuth).mockReset();
});

describe("guardApiRequest", () => {
  it("rejects a cross-origin request with 403 before ever checking auth", async () => {
    const res = await guardApiRequest(
      makeRequest({
        origin: "https://evil.example.com",
        host: "grimoire.example.com",
      })
    );

    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
    expect(requireAuth).not.toHaveBeenCalled();
  });

  it("passes a same-origin request through to the auth check (positive control)", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: "admin" });

    const res = await guardApiRequest(
      makeRequest({
        origin: "https://grimoire.example.com",
        host: "grimoire.example.com",
      })
    );

    expect(res).toBeNull();
    expect(requireAuth).toHaveBeenCalledOnce();
  });

  it("passes a request with no Origin header through to the auth check", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: "admin" });

    const res = await guardApiRequest(
      makeRequest({ host: "grimoire.example.com" })
    );

    expect(res).toBeNull();
    expect(requireAuth).toHaveBeenCalledOnce();
  });

  it("returns 401 when the same-origin request has no valid session", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new UnauthorizedError());

    const res = await guardApiRequest(
      makeRequest({
        origin: "https://grimoire.example.com",
        host: "grimoire.example.com",
      })
    );

    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it("rethrows an unexpected error rather than swallowing it as a 401", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("db is on fire"));

    await expect(
      guardApiRequest(
        makeRequest({
          origin: "https://grimoire.example.com",
          host: "grimoire.example.com",
        })
      )
    ).rejects.toThrow("db is on fire");
  });
});
