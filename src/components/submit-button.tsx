"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SubmitButton({
  children = "Submit",
  className,
  isLoading: propIsLoading,
  variant,
  size,
}: {
  children?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const { pending } = useFormStatus();
  const isLoading = propIsLoading ?? pending;

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
