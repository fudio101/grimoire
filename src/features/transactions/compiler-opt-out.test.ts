import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Pins the `"use no memo"` directive on the window-virtualized card list.
 *
 * A source-text assertion, and knowingly so: Vitest transforms without the
 * React Compiler, so no rendered test here can observe the defect — under the
 * compiler the component's output was memoised on inputs that never change
 * (the virtualizer object), and the mobile list stopped after its first nine
 * cards no matter how far the page scrolled. That was reproduced and then
 * fixed by this one directive in a headless browser (see the component's
 * comment for the numbers). What a test *can* do is refuse to let the line be
 * "cleaned up" by someone who does not know why it is there.
 *
 * The desktop table is deliberately not pinned: `useVirtualizer` is on the
 * compiler's own incompatible-library list, so that component is skipped
 * without a directive — and it scrolls correctly, verified the same way.
 */
describe("TransactionCardList stays out of the React Compiler", () => {
  const source = fs.readFileSync(
    path.join(here, "transaction-card-list.tsx"),
    "utf8"
  );

  it("carries the directive as the first statement of the component body", () => {
    const body = source.slice(
      source.indexOf("export function TransactionCardList")
    );
    const firstStatement = body
      .slice(body.indexOf("}) {") + 4)
      .match(/^\s*(?:\/\*[\s\S]*?\*\/\s*)*("use no memo";)/);
    expect(firstStatement?.[1]).toBe('"use no memo";');
  });

  it("still reads the virtualizer during render (the reason the directive exists)", () => {
    // The control: if the list were ever rewritten to not read virtualizer
    // state in render, the directive would be stale — this makes that visible.
    expect(source).toContain("useWindowVirtualizer(");
    expect(source).toContain("virtualizer.getVirtualItems()");
  });
});
