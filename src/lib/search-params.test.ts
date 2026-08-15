import { describe, expect, it } from "vitest";
import {
  parseOverviewSearch,
  parsePublicReportSearch,
  parseTransactionSearch,
  pickSearchParam,
} from "@/lib/search-params";

describe("pickSearchParam", () => {
  it("returns a single string value unchanged (positive control)", () => {
    expect(pickSearchParam("2026-08")).toBe("2026-08");
  });

  it("returns the first occurrence for a repeated key, matching URLSearchParams.get()", () => {
    const params = new URLSearchParams("category=a&category=b");
    expect(pickSearchParam(["a", "b"])).toBe(params.get("category"));
    expect(pickSearchParam(["a", "b"])).toBe("a");
  });

  it("passes undefined through unchanged", () => {
    expect(pickSearchParam(undefined)).toBeUndefined();
  });
});

describe("search-param parsers agree on the same URL (server/client query-key parity)", () => {
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

  it("parseTransactionSearch: full valid range + category passes through", () => {
    expect(
      parseTransactionSearch({
        fromMonth: "2026-01",
        toMonth: "2026-08",
        category: "cat-1",
      })
    ).toEqual({ fromMonth: "2026-01", toMonth: "2026-08", category: "cat-1" });
  });

  it("parseTransactionSearch: a malformed bound degrades to undefined, not a thrown error", () => {
    const result = parseTransactionSearch({
      fromMonth: "2026-01",
      toMonth: "garbage",
    });
    expect(result).toEqual({ fromMonth: "2026-01", toMonth: undefined });
  });

  it("parsePublicReportSearch: same shape as parseTransactionSearch for the same URL", () => {
    const url = {
      fromMonth: "2026-01",
      toMonth: "2026-08",
      category: "cat-1",
    };
    expect(parsePublicReportSearch(url)).toEqual(parseTransactionSearch(url));
  });

  it("all three parsers derive the same query key from a Next searchParams-shaped object with a repeated param", () => {
    // Simulates what Next hands a server page for `?category=a&category=b`:
    // an array, exactly what pickSearchParam exists to narrow before any
    // parser sees it.
    const raw = { category: ["a", "b"] as string[] | undefined };
    const narrowed = { category: pickSearchParam(raw.category) };
    expect(parseTransactionSearch(narrowed)).toEqual({
      fromMonth: undefined,
      toMonth: undefined,
      category: "a",
    });
    expect(parsePublicReportSearch(narrowed)).toEqual(
      parseTransactionSearch(narrowed)
    );
  });
});
