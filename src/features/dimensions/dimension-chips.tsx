import { useId } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DimensionCopy } from "@/features/dimensions/dimension-copy";
import type { DimensionOption } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A single value that stands for "no filter" inside the toggle group, which
 * cannot hold `null`. It never leaves this file: `onChange` gets `null`.
 */
const EVERYTHING = "__everything__";

/**
 * The one word that is the same for both dimensions, so it lives here rather
 * than in `dimension-copy.ts`, which holds only what *differs*. The group is
 * labelled by the dimension's question, so "Tất cả" alone is unambiguous.
 */
export const EVERYTHING_LABEL = "Tất cả";

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
 *   set on the chip itself, and it is the chip that gets tapped.
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

  // In a filter, `null` is a real answer ("everything") and its chip is
  // pressed. In a required choice, `null` is the absence of one.
  const pressed = value ?? (required ? undefined : EVERYTHING);

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
          const picked = next[0];
          // Pressing the already-pressed chip un-presses it and the group
          // reports an empty selection; that reads as "clear", same as
          // tapping "everything" — one tap out of a narrowed view, always.
          onChange(
            picked === undefined || picked === EVERYTHING ? null : picked
          );
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
          // Pressed, because it *is* the active value. Tapping it clears.
          <Chip value={value} className="text-muted-foreground">
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
