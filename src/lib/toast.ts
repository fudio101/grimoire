import { toast } from "@/components/ui/toast";

/**
 * Thin Vietnamese-labelled wrapper over the Base UI toast manager.
 *
 * `toast` is a module-level singleton, so these are callable from mutation
 * callbacks and event handlers without a hook — which is the whole reason the
 * two call sites that previously used `window.alert()` reached for it: they are
 * inside `onError`, where no component is rendering.
 */
export function toastError(message?: string | null) {
  toast.add({
    title: "Không thực hiện được",
    description: message || "Vui lòng thử lại.",
    type: "error",
  });
}

export function toastSuccess(title: string, description?: string) {
  toast.add({ title, description, type: "success" });
}
