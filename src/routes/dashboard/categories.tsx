import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Kept so existing bookmarks and any share-link screenshots that named this
 * path still land somewhere useful after the move under /dashboard/manage.
 */
export const Route = createFileRoute("/dashboard/categories")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/manage/categories" });
  },
});
