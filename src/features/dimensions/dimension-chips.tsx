import { useId } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DimensionCopy } from "@/features/dimensions/dimension-copy";
import type { DimensionOption } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Internal toggle values for the two chips that are not options. Neither is
 * ever an option id (ids are UUIDs), and neither leaves this file: `onChange`
 * gets `null` for "everything" and the real value is what the stale chip is
 * *about*, not what it is keyed by — so a hand-edited URL carrying one of
 * these strings cannot make two chips share a value.
 */
const EVERYTHING = "__everything__";
const STALE = "__stale__";

/**
 * The one word that is the same for both dimensions, so it lives here rather
 * than in `dimension-copy.ts`, which holds only what *differs*. The group is
 * labelled by the dimension's question, so "Tất cả" alone is unambiguous.
 */
const EVERYTHING_LABEL = "Tất cả";

/**
 * What a change reported by the toggle group means for the caller.
 *
 * `undefined` means "no change": in `required` mode, un-pressing the chosen
 * chip is ignored, because a required answer can be changed but not taken
 * back — otherwise an accidental second tap on the edit form silently emptied
 * the field and the user only found out at "Cập nhật". In filter mode the same
 * gesture is "clear", the same as tapping "Tất cả": one tap out of a narrowed
 * view, always.
 */
export function resolveSelection(
  next: readonly string[],
  required: boolean
): string | null | undefined {
  const picked = next[0];
  if (picked === undefined || picked === STALE)
    return required ? undefined : null;
  if (picked === EVERYTHING) return null;
  return picked;
}

/**
 * One row of tappable chips, one per option. This is how both dimensions are
 * chosen everywhere: the filter rows on the dashboard and the public report,
 * and the two required pickers on the transaction form.
 *
 * Every choice is visible at once and picking one is a single tap — no
 * open-choose-close cycle, no hidden state. That is the whole reason #131
 * exists: the person this tracker is for should not have to open a dialog,
 * scroll a list and close it again to make one choice.
 *
 * Two modes, one prop apart. A **filter** leads with an explicit "everything"
 * chip and `null` means "not narrowed". A **required** choice has no such
 * chip, `null` means "not yet answered", and nothing is pressed until the
 * user answers — so an unanswered field looks unanswered, which is the same
 * property the select this replaces had to be taught (`data-placeholder`).
 *
 * Behaviour carried over from that select, each paid for by a bug:
 *
 * - **A labelled group, not bare buttons.** The question is a visible label
 *   and the group points at it with `aria-labelledby`, so a screen reader
 *   announces "Tiền dùng để làm gì?, group" rather than a run of loose
 *   buttons whose relationship is only visual.
 * - **A stale value must not read as "everything".** When `value` names no
 *   option — an id left in a URL after a rename or a delete — the
 *   "everything" chip is *not* pressed; a pressed chip reading `copy.unknown`
 *   stands in its place, so the reader can see a filter is active and clear
 *   it. Without this, a filter matching zero rows would look identical to no
 *   filter at all.
 * - **A 48px target on a phone.** The public report's select once lost its
 *   height in a port because the class went to a wrapper. Here the size is
 *   `toggleVariants`' `touch`, set on the group and inherited by every chip.
 *
 * Built on the toggle group rather than plain buttons: it gives arrow-key
 * movement between chips and the pressed state for free, and "at most one
 * pressed" is what a single-select toggle group is for.
 */
export function DimensionChips({
  options,
  value,
  onChange,
  copy,
  required = false,
  className,
}: {
  options: DimensionOption[];
  /** The selected option's id, or `null` for everything / not yet chosen. */
  value: string | null;
  onChange: (value: string | null) => void;
  copy: Pick<DimensionCopy, "question" | "unknown">;
  /** No "everything" chip; nothing is pressed until a choice is made. */
  required?: boolean;
  className?: string;
}) {
  const labelId = useId();

  const isStale =
    value !== null && !options.some((option) => option.id === value);

  // Exactly one of: the stale chip, the chosen option, "everything" (filter
  // mode only), or nothing (required mode, unanswered).
  const pressed = isStale
    ? STALE
    : (value ?? (required ? undefined : EVERYTHING));

  return (
    <div className={cn("space-y-2", className)}>
      <p id={labelId} className="text-sm leading-none font-medium">
        {copy.question}
      </p>
      <ToggleGroup
        aria-labelledby={labelId}
        variant="outline"
        size="touch"
        value={pressed === undefined ? [] : [pressed]}
        onValueChange={(next) => {
          const resolved = resolveSelection(next, required);
          if (resolved !== undefined) onChange(resolved);
        }}
        className="flex-wrap"
      >
        {!required && <Chip value={EVERYTHING}>{EVERYTHING_LABEL}</Chip>}
        {options.map((option) => (
          <Chip key={option.id} value={option.id}>
            {option.name}
          </Chip>
        ))}
        {isStale && (
          // Pressed, because it *is* the active value. Tapping it clears (in a
          // filter) — see `resolveSelection`.
          <Chip value={STALE} className="text-muted-foreground">
            {copy.unknown}
          </Chip>
        )}
      </ToggleGroup>
    </div>
  );
}

/**
 * Size comes from the group (`size="touch"` in `toggleVariants` — 48px on a
 * phone, 40px for a pointer); this only adds the pressed colouring, which the
 * toggle's muted default is too quiet for on a filter row.
 */
function Chip({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupItem>) {
  return (
    <ToggleGroupItem
      className={cn(
        "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90",
        className
      )}
      {...props}
    />
  );
}
