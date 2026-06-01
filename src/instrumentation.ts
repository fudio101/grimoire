export async function register() {
  // Run only in the Node.js server runtime (not Edge, not during static work).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runMigrations } = await import("@/lib/db/migrate");
  runMigrations();
}
