import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

export function ConfirmDialog({
  trigger,
  title = "Xác nhận",
  description = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmLabel = "Xoá",
  cancelLabel = "Huỷ",
  variant = "destructive",
  onConfirm,
}: {
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Not every confirmation is a deletion — rotating a share code is not. */
  variant?: React.ComponentProps<typeof AlertDialogAction>["variant"];
  onConfirm: () => unknown | Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      // Previously a bare `finally`: a throwing onConfirm left the dialog open
      // with no explanation and no sign anything had gone wrong.
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Không thực hiện được. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger render={trigger as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="px-6 text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
