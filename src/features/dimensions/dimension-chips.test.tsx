import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DimensionChips } from "@/features/dimensions/dimension-chips";

/**
 * The chips replace `DimensionSelect` on the filter rows, and each behaviour
 * pinned here was first pinned on the select because a real bug lost it. See
 * `dimension-select.test.tsx` for the pattern and the history.
 *
 * Server-rendered rather than driven in a browser: the pressed state, the
 * label and the accessible name are all decided during render, so static
 * markup is enough to catch a regression and it needs no DOM environment or
 * new dependency.
 */
const OPTIONS = [
  { id: "opt-1", name: "Lựa chọn một" },
  { id: "opt-2", name: "Lựa chọn hai" },
];

const COPY = {
  question: "Chọn cái nào?",
  everything: "Tất cả",
  unknown: "Không còn tồn tại",
};

function markup(
  props: Partial<Parameters<typeof DimensionChips>[0]> = {}
): string {
  return renderToStaticMarkup(
    <DimensionChips
      options={OPTIONS}
      value={null}
      onChange={() => {}}
      copy={COPY}
      {...props}
    />
  );
}

type Chip = { text: string; pressed: boolean };

/**
 * Every chip, in order, as the text a reader sees plus whether it is pressed.
 *
 * Parsed out of the `<button>`s rather than asserted against the whole markup
 * — the group and the label carry ids and attributes of their own, and "the
 * raw id appears nowhere" would be false even when every chip is right,
 * because Base UI's Toggle writes its `value` onto the element.
 */
function chips(
  props: Partial<Parameters<typeof DimensionChips>[0]> = {}
): Chip[] {
  const html = markup(props);
  const out: Chip[] = [];
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
  for (const match of html.matchAll(re)) {
    const attrs = match[1];
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    out.push({ text, pressed: /aria-pressed="true"/.test(attrs) });
  }
  return out;
}

const pressedOf = (list: Chip[]) => list.filter((c) => c.pressed);

describe("DimensionChips", () => {
  it("renders one chip per option, by name, behind an 'everything' chip", () => {
    expect(chips().map((c) => c.text)).toEqual([
      COPY.everything,
      "Lựa chọn một",
      "Lựa chọn hai",
    ]);
  });

  it("presses 'everything' and nothing else when there is no value", () => {
    const pressed = pressedOf(chips({ value: null }));
    expect(pressed.map((c) => c.text)).toEqual([COPY.everything]);
  });

  it("presses exactly the selected option, and not 'everything' (positive control)", () => {
    const pressed = pressedOf(chips({ value: "opt-2" }));
    expect(pressed.map((c) => c.text)).toEqual(["Lựa chọn hai"]);
  });

  it("never shows a raw id where a name belongs", () => {
    for (const value of [null, "opt-1", "gone-from-the-list"]) {
      for (const chip of chips({ value })) {
        expect(chip.text).not.toContain("opt-");
        expect(chip.text).not.toContain("gone-from-the-list");
        expect(chip.text).not.toContain("__everything__");
      }
    }
  });

  /**
   * The behaviour the select's `unknownLabel` existed for: on the filter row
   * "no filter" and "a filter matching nothing" must not look the same.
   */
  it("distinguishes a stale value from 'everything'", () => {
    const stale = chips({ value: "gone-from-the-list" });

    // 'everything' is NOT pressed — a filter is in force.
    const everything = stale.find((c) => c.text === COPY.everything);
    expect(everything?.pressed).toBe(false);

    // ...and a pressed chip says so, in words, so it can be seen and cleared.
    expect(pressedOf(stale).map((c) => c.text)).toEqual([COPY.unknown]);

    // The control: with a value that matches, no such chip exists at all.
    expect(chips({ value: "opt-1" }).map((c) => c.text)).not.toContain(
      COPY.unknown
    );
    expect(chips({ value: null }).map((c) => c.text)).not.toContain(
      COPY.unknown
    );
  });

  it("is a group labelled by the visible question, not a run of bare buttons", () => {
    const html = markup();

    const labelledBy = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(labelledBy).toBeTruthy();

    // The id the group points at must exist, and must carry the question.
    const label = html.match(
      new RegExp(`id="${labelledBy}"[^>]*>([^<]*)<`)
    )?.[1];
    expect(label).toBe(COPY.question);

    // And the group is one element wrapping the chips, with a group role.
    expect(html).toMatch(
      /role="group"[^>]*aria-labelledby=|aria-labelledby="[^"]+"[^>]*role="group"/
    );
  });

  /**
   * The size lives on the chip, not a wrapper — the public report's control
   * once lost its 48px height exactly that way. Asserted as a class because
   * static markup has no layout; this is the one place a class string is
   * the observable.
   */
  it("gives every chip the touch-sized height on a phone", () => {
    const html = markup({ value: "gone-from-the-list" });
    const buttons = [...html.matchAll(/<button\b([^>]*)>/g)].map((m) => m[1]);
    expect(buttons.length).toBe(OPTIONS.length + 2); // everything + options + stale
    for (const attrs of buttons) {
      expect(attrs).toMatch(/class="[^"]*\bh-12\b/);
    }
  });
});
