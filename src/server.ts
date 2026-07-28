import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { runMigrations } from "@/lib/db/migrate";

// Replaces the App Router's instrumentation.register() hook. This module is
// compiled only into the SSR environment and evaluated once, when the server
// bundle loads — so migrations run exactly once, before the first request.
runMigrations();

export default createServerEntry({
  fetch: (request) => handler.fetch(request),
});
