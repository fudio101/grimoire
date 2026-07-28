import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY: becomes `beforeLoad: () => { throw redirect({ to: "/dashboard" }) }`
// once the dashboard route exists. Kept renderable for now so the shell —
// SSR, stylesheet, self-hosted font, boot migrations — can be verified before
// the rest of the app is ported on top of it.
export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-bold tracking-tight">Grimoire</h1>
      <p className="text-sm text-muted-foreground">Quản lý chi tiêu</p>
    </main>
  );
}
