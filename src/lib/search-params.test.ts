import { describe, expect, it } from "vitest";
import {
  parseOverviewSearch,
  parsePublicReportSearch,
  parseTransactionSearch,
  pickSearchParam,
  readPublicReportSearch,
  readTransactionSearch,
  toSearchString,
} from "@/lib/search-params";

describe("pickSearchParam", () => {
  it("returns a single string value unchanged (positive control)", () => {
    expect(pickSearchParam("2026-08")).toBe("2026-08");
  });

  it("returns the first occurrence for a repeated key, matching URLSearchParams.get()", () => {
    const params = new URLSearchParams("purpose=a&purpose=b");
    expect(pickSearchParam(["a", "b"])).toBe(params.get("purpose"));
    expect(pickSearchParam(["a", "b"])).toBe("a");
  });

  it("passes undefined through unchanged", () => {
    expect(pickSearchParam(undefined)).toBeUndefined();
  });
});

describe("search-param parsers agree on the same URL (one URL, one query key)", () => {
  it("parseOverviewSearch: valid month passes through", () => {
    expect(parseOverviewSearch({ month: "2026-08" })).toEqual({
      month: "2026-08",
    });
  });

  it("parseOverviewSearch: malformed month degrades to undefined rather than throwing", () => {
    expect(() => parseOverviewSearch({ month: "not-a-month" })).not.toThrow();
    expect(parseOverviewSearch({ month: "not-a-month" })).toEqual({
      month: undefined,
    });
  });

  it("parseTransactionSearch: full valid range + both dimensions passes through", () => {
    expect(
      parseTransactionSearch({
        fromMonth: "2026-01",
        toMonth: "2026-08",
        purpose: "purpose-1",
        fundingSource: "pot-1",
      })
    ).toEqual({
      fromMonth: "2026-01",
      toMonth: "2026-08",
      purpose: "purpose-1",
      fundingSource: "pot-1",
    });
  });

  it("parseTransactionSearch: a malformed bound degrades to undefined, not a thrown error", () => {
    const result = parseTransactionSearch({
      fromMonth: "2026-01",
      toMonth: "garbage",
    });
    expect(result).toEqual({ fromMonth: "2026-01", toMonth: undefined });
  });

  it("parsePublicReportSearch: agrees with the dashboard parser on months and both dimensions", () => {
    const url = {
      fromMonth: "2026-01",
      toMonth: "2026-08",
      purpose: "purpose-1",
      fundingSource: "pot-1",
    };
    // Both surfaces now read the same four view filters, so the two parsers
    // must agree on all of them — that parity is why they live in one module.
    // (Scope is still one-dimensional; `fundingSource` here is a view filter,
    // see ADR-0002's amendment.)
    expect(parsePublicReportSearch(url)).toEqual(parseTransactionSearch(url));
    expect(parsePublicReportSearch(url).fundingSource).toBe("pot-1");
  });

  it("all three parsers derive the same query key from a Next searchParams-shaped object with a repeated param", () => {
    // Simulates what Next hands a server page for `?purpose=a&purpose=b`:
    // an array, exactly what pickSearchParam exists to narrow before any
    // parser sees it.
    const raw = { purpose: ["a", "b"] as string[] | undefined };
    const narrowed = { purpose: pickSearchParam(raw.purpose) };
    expect(parseTransactionSearch(narrowed)).toEqual({
      fromMonth: undefined,
      toMonth: undefined,
      purpose: "a",
      fundingSource: undefined,
    });
    expect(parsePublicReportSearch(narrowed).purpose).toBe(
      parseTransactionSearch(narrowed).purpose
    );
  });
});

describe("toSearchString: hrefs and parsers spell the parameters the same way", () => {
  it("round-trips a full search through both parsers", () => {
    const search = {
      fromMonth: "2026-01",
      toMonth: "2026-08",
      purpose: "purpose-1",
      fundingSource: "pot-1",
    };
    const raw = Object.fromEntries(new URLSearchParams(toSearchString(search)));
    expect(readTransactionSearch(raw)).toEqual(search);
    expect(readPublicReportSearch(raw)).toEqual(search);
  });

  it("omits absent and empty values, so a cleared filter leaves no trace in the URL", () => {
    expect(toSearchString({})).toBe("");
    expect(toSearchString({ purpose: undefined, fundingSource: "" })).toBe("");
    // The control: a present value is written.
    expect(toSearchString({ purpose: "purpose-1" })).toBe("purpose=purpose-1");
  });
});

describe("readXSearch: the routes and the schemas cannot drift apart", () => {
  /**
   * These read Next's raw `searchParams` shape directly, which is the whole
   * point: the parsers take `unknown`, so a page spelling a parameter wrongly
   * is not a type error — zod just strips the unrecognised key and the filter
   * silently does nothing on the server while the client honours it. Naming
   * each parameter once, inside these functions, is what removes that; these
   * tests pin the names they use.
   */
  it("readTransactionSearch picks up both dimensions and the month range", () => {
    expect(
      readTransactionSearch({
        fromMonth: "2026-01",
        toMonth: "2026-08",
        purpose: "purpose-1",
        fundingSource: "pot-1",
      })
    ).toEqual({
      fromMonth: "2026-01",
      toMonth: "2026-08",
      purpose: "purpose-1",
      fundingSource: "pot-1",
    });
  });

  it("readPublicReportSearch picks up both dimensions and the month range", () => {
    expect(
      readPublicReportSearch({
        fromMonth: "2026-01",
        toMonth: "2026-01",
        purpose: "purpose-1",
        fundingSource: "pot-1",
      })
    ).toEqual({
      fromMonth: "2026-01",
      toMonth: "2026-01",
      purpose: "purpose-1",
      fundingSource: "pot-1",
    });
  });

  it("ignores the retired parameter name on both surfaces", () => {
    // The negative half: `?category=` is not a filter any more, on either
    // route. Paired with the positive cases above, so "no filter applied"
    // cannot be mistaken for "no filter ever applied".
    const retired = { category: "purpose-1" };
    expect(readTransactionSearch(retired).purpose).toBeUndefined();
    expect(readPublicReportSearch(retired).purpose).toBeUndefined();
    // And an unknown key is stripped rather than carried, on both — the
    // control that the parsers accept only what they name.
    const unknown = { pot: "pot-1" };
    expect(readTransactionSearch(unknown)).not.toHaveProperty("pot");
    expect(readPublicReportSearch(unknown)).not.toHaveProperty("pot");
  });

  it("narrows a repeated parameter the way URLSearchParams.get() does", () => {
    // Next hands a server page an array for `?purpose=a&purpose=b`, while
    // `URLSearchParams.get()` — how the same URL reads anywhere else — returns
    // the first. Narrowing the same way keeps one URL meaning one query key.
    expect(readTransactionSearch({ purpose: ["a", "b"] }).purpose).toBe("a");
    expect(readPublicReportSearch({ purpose: ["a", "b"] }).purpose).toBe("a");
  });
});
