# 1. Ingress is a Cloudflare Tunnel, and the origin publishes no port

Date: 2026-09-05

## Status

Accepted.

## Context

Nothing in this repository described how a request reaches the application. `docker-compose.yml` published `3000:3000`, the README did not mention a proxy, and the Dockerfile only carried `EXPOSE 3000`. Anyone reading the repo would conclude the app is served directly off a host port.

That gap produced a concrete error. Issue #112 was written against an inferred topology — proxied A records pointing at the VPS, with `103.249.117.159:3000` said to "reach the app directly, bypassing both Cloudflare and Traefik" — and derived from it an instruction to remove the `ports:` block, carrying a warning that getting it wrong would take the site down. The premise was false, and the derived urgency was misdirected. It was corrected only because someone asked the question out loud.

The trigger for writing this down was a second decision that depends on the same facts: a nonce-based CSP whose verification has to happen against the real hostname, because Cloudflare can alter headers and minify HTML between the origin and the browser.

## Decision

Record the real chain, and treat it as a documented precondition rather than folklore.

```
browser → Cloudflare edge → cloudflared → Traefik → grimoire:3000
```

- Ingress is a **Cloudflare Tunnel**. `cloudflared` runs as a container on the `traefik_network` Docker network and dials out; nothing dials in.
- **No port is published on the VPS.** Verified against `docker ps`: the grimoire container reports `3000/tcp`, not `0.0.0.0:3000->3000/tcp`. There is no direct-to-origin path to bypass.
- DNS is a tunnel CNAME. There is no A record pointing at the VPS for this service.
- Traefik routes to the container by service name over `traefik_network`.

**Verified end to end** (2026-09-05, from the three compose files that define the chain):

- `cloudflared` runs `tunnel run` with a `TUNNEL_TOKEN`, on `traefik_network`, with no ports. **The tunnel's ingress is configured remotely in Cloudflare Zero Trust, not in a local `config.yml`** — so there is no file on the host to read it from.
- `traefik` declares **no `ports:` block either**, and lives only on `traefik_network` plus an internal `traefik_socket_proxy`. It is unreachable from the host: the whole chain is closed, not just the app.
- `grimoire` is routed by Traefik labels: `Host(\`grimoire.fudio101.com\`)`, entrypoint `web`, `loadbalancer.server.port=3000`, `traefik.docker.network=traefik_network`.
- Traefik exposes a single `web` entrypoint with no `websecure`, consistent with TLS terminating at Cloudflare and the internal hops being plain HTTP inside Docker.
- Traefik reads the Docker API through `tecnativa/docker-socket-proxy` with `POST: "0"` (read-only).

The public hostname is **`grimoire.fudio101.com`**.

Consequences that follow from this, and that other work is entitled to rely on:

- **`CF-Connecting-IP` is the trustworthy client IP.** Cloudflare sets it as a single value; `cloudflared` forwards it; Traefik normalises only the `X-Forwarded-*` family and does not touch this header name. Anything IP-based (rate limiting, in particular) should read it, falling back to the rightmost `X-Forwarded-For` entry only when it is absent.
- **That trust is conditional on the origin staying unreachable.** Header trust is only as good as the guarantee that every request came through Cloudflare. Publishing a host port, or exposing the container on another network, silently invalidates it — a caller reaching the origin directly controls every header, since Next only assigns them when absent and never overwrites.
- **Response headers must be verified against the real hostname.** Cloudflare sits between the origin and the browser and can inject, alter, or minify. `curl -I` against localhost proves what the app emitted, not what a visitor receives.
- **`docker-compose.yml` in this repo is not the deploy artifact.** Production is created from a Dockge-managed stack on the VPS. Tracked in issue #125.

  "Only what is baked into the image reaches production" is the right instinct but not a rule: a compose file can *override* what the image declares. The deployed stack sets its own `healthcheck:` (`wget -qO- http://127.0.0.1:3000`), which **supersedes the image's `HEALTHCHECK` entirely** — so the `/api/health` check added in #126 does not run in production until that block is removed or repointed. PR #126 claimed the opposite; this is the correction. The same applies to `environment:`, `volumes:` and `networks:`.

## Consequences

The rate-limiting work in #112 keeps its conclusion — read `CF-Connecting-IP` — but must be re-read against this document rather than its own background section, which is wrong. Its instruction to remove `ports:` remains correct as hardening, since a published port would break the precondition above, but it is not the emergency the issue describes: the running container does not publish one.

Any future change that publishes a port, adds a second ingress, or moves the container off `traefik_network` invalidates the header-trust assumption and should update this record rather than work around it.

## Verification

Anything asserted here is checkable, and should be re-checked rather than trusted if it starts to matter again:

- `docker ps --format '{{.Names}}\t{{.Networks}}\t{{.Ports}}'` — grimoire must show no host binding.
- The tunnel's ingress mapping lives in the Cloudflare Zero Trust dashboard (token-based tunnel, no local config file). Check it there if the routing ever needs re-confirming.
- `curl -I https://<hostname>/login` against the real domain, not localhost.
