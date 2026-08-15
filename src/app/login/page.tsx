import { LoginForm } from "./login-form";

// No data to prefetch and nothing route-specific to guard here — the root
// layout's `export const dynamic = "force-dynamic"` (added in PR 7) already
// keeps this segment dynamic, and there is no auto-redirect for an
// already-authenticated visitor (matches the original TanStack route: none
// existed there either).
export default function LoginPage() {
  return <LoginForm />;
}
