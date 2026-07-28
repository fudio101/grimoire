import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * `isLoading` used to be optional, falling back to useFormStatus() from
 * react-dom. That fallback only produced a value inside a `<form action={...}>`,
 * and the one form relying on it was the logout form, which is now a mutation.
 * Every other call site already passed the flag explicitly.
 */
export function SubmitButton({
  children = "Submit",
  className,
  isLoading,
  variant,
  size,
}: {
  children?: React.ReactNode;
  className?: string;
  isLoading: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  return (
    <Button
      type="submit"
      disabled={isLoading}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
