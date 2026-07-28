import { createFileRoute } from "@tanstack/react-router";

// PLACEHOLDER — real content lands with the dashboard routes. Present now so
// the nav links type-check and the auth guard can be exercised on every path.
export const Route = createFileRoute("/dashboard/categories")({
  component: () => null,
});
