import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  // /dashboard's own beforeLoad sends signed-out visitors on to /login, so the
  // two-hop chain matches what the Next.js page plus middleware did.
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
