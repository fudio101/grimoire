import { NextResponse, type NextRequest } from "next/server";

/**
 * ⚠️ This file is NOT an authentication boundary, and must not become one.
 *
 * Its only job is to mint a per-request nonce and attach the Content-Security-
 * Policy header. Auth stays where it is: `readSession()` in
 * `src/app/dashboard/layout.tsx` as the UX guard, and
 * `requireAuth()`/`requireAuthForAction()` in `src/server/auth-guard.ts` as the
 * real security boundary, checked inside every private Server Action and Route
 * Handler. Next's own guidance is that proxy "should not serve as the sole line
 * of defense", and a Server Action reference is a stable id postable to any
 * route regardless of which page rendered it — so a path-matched check here
 * could never be the boundary anyway. Adding an auth check to this file would
 * not add a layer; it would create a second, weaker place to look for one.
 */

/**
 * A nonce cannot cover `style="..."` attributes — CSP has no mechanism for that,
 * since `style-src-attr` (which `style-src` backstops) accepts only
 * `'unsafe-inline'` or nothing. This app writes inline style attributes on every
 * screen: TanStack Virtual positions each table row with a `transform`, the
 * table declares its grid template inline, and Base UI/vaul position popovers
 * and the mobile drawer the same way. Verified by running the built app with
 * `'unsafe-inline'` withheld and reading the violations the browser reported.
 *
 * So `style-src` keeps `'unsafe-inline'` deliberately. It buys less than it
 * looks like it does: the XSS that matters executes script, and `script-src`
 * below is strict — nonce plus `'strict-dynamic'`, no `'unsafe-inline'`, no
 * host allowlist to bypass.
 */
function buildCsp(nonce: string, isDev: boolean): string {
  return [
    `default-src 'self'`,
    // 'strict-dynamic' makes the browser trust scripts loaded *by* a nonced
    // script, which is how Next's own chunk loading works — without it every
    // generated bundle URL would need enumerating.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // See the comment above: this line is a considered exception, not an oversight.
    `style-src 'self' 'unsafe-inline'`,
    // blob:/data: are what next/image and inline SVG data URIs need.
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    // Server Actions post back to the same origin; nothing here submits anywhere else.
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    /*
     * Production is reached over HTTPS through Cloudflare (ADR-0001), so
     * upgrading is exactly right there. `next dev` serves plain HTTP, where
     * the directive rewrites every subresource and form action to https://
     * — nothing local is listening for TLS, so the stylesheet and every JS
     * chunk fail, the page never hydrates, and the login form falls back to
     * a native submit that `form-action 'self'` then blocks.
     *
     * `localhost` hides all of that: browsers treat it as a
     * potentially-trustworthy origin and skip the upgrade. It only bites
     * over a LAN address — which is the only way to open the app on a real
     * phone, and mobile is where this app's primary flows live.
     */
    ...(isDev ? [] : [`upgrade-insecure-requests`]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  // crypto.randomUUID() is available in the proxy runtime; base64 keeps the
  // header value compact and matches what Next's own docs generate.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  // Next reads the nonce back out of the *request*'s CSP header during SSR and
  // applies it to the framework and page bundles automatically, so both headers
  // have to be set: the request one for rendering, the response one for the
  // browser.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      /*
       * Static assets and the API carry no inline script, so a nonce for them
       * would be minted and discarded. Prefetches are excluded for the same
       * reason and one more: a prefetched payload is rendered later, under a
       * different request's nonce.
       */
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
