import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DimensionSelect } from "@/features/dimensions/dimension-select";

/**
 * The trigger has to show a *name*.
 *
 * This exists because it once showed neither: Base UI resolves a select
 * trigger's label from the Root's `items` prop, from `itemToStringLabel`, or
 * from a `SelectValue` children function — never from the `<SelectItem>`s
 * rendered beneath it. With none of the three supplied it serialises the value
 * instead, so every dimension select on the form, the filter row and the
 * public report rendered the internal `__none__` sentinel and then, once
 * something was picked, a raw uuid. Nothing failed; it just read as gibberish,
 * which is the kind of defect a status-code smoke test walks straight past.
 *
 * Server-rendered rather than driven in a browser: the label is chosen during
 * render, so static markup is enough to catch it, and it needs no DOM
 * environment or new dependency.
 */
const OPTIONS = [
  { id: "opt-1", name: "Lựa chọn một" },
  { id: "opt-2", name: "Lựa chọn hai" },
];

const PLACEHOLDER = "Chọn một mục…";
const EVERYTHING = "Tất cả";

/**
 * The text the trigger actually shows.
 *
 * Read out of the label span rather than asserted against the whole markup:
 * Base UI also renders a visually hidden `<input value="...">` carrying the
 * raw value for form submission, so "the id does not appear anywhere in the
 * HTML" would be false even when the label is perfectly correct.
 */
function markup(
  props: Partial<Parameters<typeof DimensionSelect>[0]> = {}
): string {
  return renderToStaticMarkup(
    <DimensionSelect
      options={OPTIONS}
      value={null}
      onChange={() => {}}
      placeholder={PLACEHOLDER}
      {...props}
    />
  );
}

/**
 * Whether the trigger carries the `data-placeholder` *attribute*.
 *
 * Matched as an attribute rather than as a substring: the trigger's class list
 * contains the Tailwind variant `data-placeholder:text-muted-foreground`, which
 * is present on every render and would make a plain `toContain` always true.
 */
function showsPlaceholder(
  props: Partial<Parameters<typeof DimensionSelect>[0]> = {}
): boolean {
  return / data-placeholder(=|\s|>)/.test(markup(props));
}

function triggerLabel(
  props: Partial<Parameters<typeof DimensionSelect>[0]> = {}
): string {
  const html = markup(props);
  const match = html.match(/data-slot="select-value"[^>]*>([\s\S]*?)<\/span>/);
  if (!match) throw new Error("no select-value element in the rendered markup");
  return match[1];
}

describe("DimensionSelect trigger label", () => {
  it("shows the selected option's name, not its id", () => {
    expect(triggerLabel({ value: "opt-2" })).toBe("Lựa chọn hai");
  });

  it("shows the placeholder when nothing is chosen and there is no empty option", () => {
    expect(triggerLabel({ value: null })).toBe(PLACEHOLDER);
  });

  it("shows the empty option's own label when one is given and nothing is chosen", () => {
    expect(triggerLabel({ value: null, emptyOption: EVERYTHING })).toBe(
      EVERYTHING
    );
  });

  it("still names the option when an empty option exists (positive control)", () => {
    // Paired with the case above: the empty label must not win once a real
    // choice has been made.
    expect(triggerLabel({ value: "opt-1", emptyOption: EVERYTHING })).toBe(
      "Lựa chọn một"
    );
  });

  it("falls back to the placeholder for a value that matches no option", () => {
    // A stale id out of a URL, say. It must not be shown to the user.
    expect(triggerLabel({ value: "gone-from-the-list" })).toBe(PLACEHOLDER);
  });

  it("never shows the internal sentinel or a raw id", () => {
    // The defect this file exists for, stated plainly.
    for (const value of [null, "opt-1", "gone-from-the-list"]) {
      for (const emptyOption of [undefined, EVERYTHING]) {
        const label = triggerLabel({ value, emptyOption });
        expect(label).not.toContain("__none__");
        expect(label).not.toContain("opt-1");
        expect(label).not.toContain("gone-from-the-list");
      }
    }
  });

  it("distinguishes a stale filter value from 'everything'", () => {
    // On the filter row `placeholder` and `emptyOption` are the same string,
    // so without `unknownLabel` a select filtering to zero rows would read
    // exactly like one filtering nothing at all.
    const everything = triggerLabel({ value: null, emptyOption: EVERYTHING });
    const stale = triggerLabel({
      value: "gone-from-the-list",
      emptyOption: EVERYTHING,
      unknownLabel: "Không còn tồn tại",
    });

    expect(everything).toBe(EVERYTHING);
    expect(stale).toBe("Không còn tồn tại");
    expect(stale).not.toBe(everything);
  });

  it("marks an unanswered required select as showing a placeholder", () => {
    // Base UI derives `data-placeholder` from `value != null`, and the styling
    // that greys the prompt hangs off it. Passing the sentinel would make a
    // required-but-empty select render in full foreground, reading as answered
    // until the form refused to submit.
    expect(showsPlaceholder({ value: null })).toBe(true);

    // The controls: a real choice is not a placeholder, and neither is an
    // explicit "everything", which is a genuine selection.
    expect(showsPlaceholder({ value: "opt-1" })).toBe(false);
    expect(showsPlaceholder({ value: null, emptyOption: EVERYTHING })).toBe(
      false
    );
  });
});
