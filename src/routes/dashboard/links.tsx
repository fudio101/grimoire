import { createFileRoute, redirect } from "@tanstack/react-router";

/** See the note in ./categories.tsx — same reason. */
export const Route = createFileRoute("/dashboard/links")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/manage/links" });
  },
});
