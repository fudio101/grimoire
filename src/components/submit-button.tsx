import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * `isLoading` used to be optional, falling back to useFormStatus() from
 * react-dom. That fallback only produced a value inside a `<form action={...}>`,
 * and the one form relying on it was the logout form, which is now a mutation.
 * Every other call site already passed the flag explicitly.
 *
 * Props are forwarded rather than enumerated: the previous signature accepted
 * only five, so a caller needing `disabled`, `onClick`, `form` or `aria-*` had
 * to reach past this component entirely.
 */
export function SubmitButton({
  children = "Submit",
  isLoading,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { isLoading: boolean }) {
  return (
    <Button type="submit" disabled={isLoading || disabled} {...props}>
      {/* No margin here — Button already applies `gap-1.5` between children,
          and the old `mr-2` stacked on top of it for 14px of dead space. */}
      {isLoading && <Spinner />}
      {children}
    </Button>
  );
}
