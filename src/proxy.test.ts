import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

/**
 * The CSP is a string assembled at request time, so the only way to assert on
 * it is to run a request through `proxy()` and read the header back — which is
 * also the only thing a browser ever sees.
 *
 * `NODE_ENV` is read inside `proxy()` rather than captured at module load, so
 * stubbing it per test is enough; no module reset is needed.
 */
function cspFor(mode: "development" | "production"): string {
  vi.stubEnv("NODE_ENV", mode);
  const response = proxy(new NextRequest("http://localhost:3000/login"));
  return response.headers.get("Content-Security-Policy") ?? "";
}

function directives(csp: string): string[] {
  return csp.split(";").map((d) => d.trim());
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the Content-Security-Policy the proxy attaches", () => {
  /**
   * The whole point of the split, and the control that stops the dev
   * assertion below from being satisfied by a CSP that lost the directive
   * everywhere. Production is served over HTTPS through Cloudflare
   * (docs/adr/0001-cloudflare-tunnel-ingress.md), where upgrading is exactly
   * what should happen.
   */
  it("keeps upgrade-insecure-requests in production", () => {
    expect(directives(cspFor("production"))).toContain(
      "upgrade-insecure-requests"
    );
  });

  /**
   * `next dev` serves plain HTTP. The directive rewrites every subresource and
   * form action to https://, which nothing local is listening for — so the
   * stylesheet and every JS chunk fail, the page never hydrates, and the login
   * form falls back to a native submit that `form-action 'self'` then blocks.
   *
   * `localhost` hides this: browsers treat it as a potentially-trustworthy
   * origin and skip the upgrade. It only bites over a LAN address, which is
   * exactly how the app has to be reached to test it on a real phone.
   */
  it("drops upgrade-insecure-requests in development", () => {
    expect(directives(cspFor("development"))).not.toContain(
      "upgrade-insecure-requests"
    );
  });

  /**
   * The control that makes the negative above mean "one directive was
   * removed" rather than "the CSP fell apart": everything that is not about
   * transport upgrading has to survive in dev, unchanged.
   */
  it("leaves the rest of the policy intact in development", () => {
    const dev = directives(cspFor("development"));

    expect(dev).toContain("default-src 'self'");
    expect(dev).toContain("style-src 'self' 'unsafe-inline'");
    expect(dev).toContain("img-src 'self' blob: data:");
    expect(dev).toContain("font-src 'self'");
    expect(dev).toContain("object-src 'none'");
    expect(dev).toContain("base-uri 'self'");
    expect(dev).toContain("form-action 'self'");
    expect(dev).toContain("frame-ancestors 'none'");
  });

  /**
   * script-src carries a per-request nonce, so it cannot be compared as a
   * literal — but it must stay strict in both modes, and `'unsafe-eval'`
   * must remain a dev-only concession.
   */
  it("keeps script-src strict, with 'unsafe-eval' confined to development", () => {
    const dev = directives(cspFor("development")).find((d) =>
      d.startsWith("script-src")
    );
    const prod = directives(cspFor("production")).find((d) =>
      d.startsWith("script-src")
    );

    for (const scriptSrc of [dev, prod]) {
      expect(scriptSrc).toMatch(
        /^script-src 'self' 'nonce-[^']+' 'strict-dynamic'/
      );
      expect(scriptSrc).not.toContain("'unsafe-inline'");
    }
    expect(dev).toContain("'unsafe-eval'");
    expect(prod).not.toContain("'unsafe-eval'");
  });

  /**
   * Next reads the nonce back off the *request* headers during SSR, so the
   * two copies of the policy have to agree — a mismatch would strip the
   * framework bundles' nonce and break the page under a policy that looks
   * correct in the response.
   */
  it("attaches the same policy to the request and the response, with a fresh nonce each time", () => {
    vi.stubEnv("NODE_ENV", "production");
    const first = proxy(new NextRequest("http://localhost:3000/login"));
    const second = proxy(new NextRequest("http://localhost:3000/login"));

    const nonceOf = (csp: string) => /'nonce-([^']+)'/.exec(csp)?.[1];
    const firstCsp = first.headers.get("Content-Security-Policy") ?? "";
    const secondCsp = second.headers.get("Content-Security-Policy") ?? "";

    expect(nonceOf(firstCsp)).toBeTruthy();
    expect(nonceOf(firstCsp)).not.toBe(nonceOf(secondCsp));
  });
});
