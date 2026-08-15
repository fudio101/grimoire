import { useEffect, useState } from "react";

/**
 * True only once `pending` has been true for `delayMs` — replaces
 * `router.tsx`'s `defaultPendingMs: 200`, which is what kept a fast month/
 * filter step from ever flashing a loading state at all. `useTransition`
 * itself never unmounts the stale view while pending (that's the whole
 * point — it's what keeps scroll position across a same-page filter
 * change), so this only gates a small "still working" affordance layered on
 * top, not a full-page replacement.
 */
export function useDelayedPending(pending: boolean, delayMs = 200): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setShow(true), delayMs);
    // Cleanup rather than an early `setShow(false)` in the body: it fires
    // both on unmount and the instant `pending` flips back to false, so a
    // finished transition never leaves `show` stuck true for the next one.
    return () => {
      clearTimeout(timer);
      setShow(false);
    };
  }, [pending, delayMs]);

  return show;
}
