import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DimensionChips,
  resolveSelection,
} from "@/features/dimensions/dimension-chips";

/**
 * The chips replaced a `DimensionSelect` (since deleted) on the filter rows
 * and then on the form, and each behaviour pinned here was first pinned on
 * that select because a real bug lost it: a trigger that showed a sentinel and
 * then a raw uuid, a stale filter that read as "everything", a required field
 * that read as answered, a 48px target lost to a wrapper.
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
  unknown: "Không còn tồn tại",
};

// The word the reader sees on the clearing chip — asserted as the literal a
// user reads, not via an export, so a change to it fails here on purpose.
const EVERYTHING_TEXT = "Tất cả";

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
      EVERYTHING_TEXT,
      "Lựa chọn một",
      "Lựa chọn hai",
    ]);
  });

  it("presses 'everything' and nothing else when there is no value", () => {
    const pressed = pressedOf(chips({ value: null }));
    expect(pressed.map((c) => c.text)).toEqual([EVERYTHING_TEXT]);
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
        // Internal toggle values are double-underscored; none may leak as text.
        expect(chip.text).not.toMatch(/__/);
      }
    }
  });

  /** Every chip's toggle `value`, in order — what the group keys pressed state by. */
  function values(
    props: Partial<Parameters<typeof DimensionChips>[0]> = {}
  ): string[] {
    return [...markup(props).matchAll(/<button\b[^>]*\bvalue="([^"]*)"/g)].map(
      (m) => m[1]
    );
  }

  it("keeps every chip's value unique, even when the URL carries an internal sentinel", () => {
    // A hand-edited `?purpose=__everything__` is just another stale id: the
    // server filters by it and finds nothing, so the chips must say "stale",
    // not "everything" — and must not end up with two chips sharing a value,
    // which would press both.
    const everythingValue = values()[0];
    const stale = chips({ value: everythingValue });
    expect(pressedOf(stale).map((c) => c.text)).toEqual([COPY.unknown]);

    for (const value of [
      null,
      "opt-1",
      "gone-from-the-list",
      everythingValue,
    ]) {
      const v = values({ value });
      expect(new Set(v).size).toBe(v.length);
    }
  });

  /**
   * What a tap means, as the pure rule the group's `onValueChange` applies.
   * Static markup cannot fire events, so the rule is tested on its own.
   */
  describe("resolveSelection", () => {
    const everythingValue = values()[0];

    it("filter: an option is chosen, 'everything' and un-pressing both clear", () => {
      expect(resolveSelection(["opt-1"], false)).toBe("opt-1");
      expect(resolveSelection([everythingValue], false)).toBeNull();
      expect(resolveSelection([], false)).toBeNull();
    });

    it("required: an option is chosen, but un-pressing is ignored rather than emptying the field", () => {
      expect(resolveSelection(["opt-2"], true)).toBe("opt-2");
      // `undefined` = no change; the caller does not call `onChange` at all.
      expect(resolveSelection([], true)).toBeUndefined();
    });
  });

  /**
   * The behaviour the select's `unknownLabel` existed for: on the filter row
   * "no filter" and "a filter matching nothing" must not look the same.
   */
  it("distinguishes a stale value from 'everything'", () => {
    const stale = chips({ value: "gone-from-the-list" });

    // 'everything' is NOT pressed — a filter is in force.
    const everything = stale.find((c) => c.text === EVERYTHING_TEXT);
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
   * The form's mode. No "everything" to fall back on, and — the property the
   * select had to be taught via `data-placeholder` — an unanswered field
   * must look unanswered rather than pressed.
   */
  describe("required", () => {
    it("has no 'everything' chip", () => {
      expect(chips({ required: true }).map((c) => c.text)).toEqual([
        "Lựa chọn một",
        "Lựa chọn hai",
      ]);
    });

    it("presses nothing until a choice is made", () => {
      expect(pressedOf(chips({ required: true, value: null }))).toEqual([]);
    });

    it("presses exactly the chosen option (positive control)", () => {
      expect(
        pressedOf(chips({ required: true, value: "opt-2" })).map((c) => c.text)
      ).toEqual(["Lựa chọn hai"]);
    });

    it("still flags a stale value instead of showing nothing pressed", () => {
      // An edit form opened on a row whose Purpose was since deleted: the
      // field holds a value, and the user must be able to see and clear it.
      const stale = chips({ required: true, value: "gone-from-the-list" });
      expect(pressedOf(stale).map((c) => c.text)).toEqual([COPY.unknown]);
    });
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
