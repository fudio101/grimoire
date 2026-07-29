import { createFileRoute, redirect } from "@tanstack/react-router";

/** /dashboard/manage has no content of its own; categories is the first tab. */
export const Route = createFileRoute("/dashboard/manage/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/manage/categories" });
  },
});
