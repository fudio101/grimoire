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
    const params = new URLSearchParams("purpose=a&purpose=b");
    expect(pickSearchParam(["a", "b"])).toBe(params.get("purpose"));
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

  it("parsePublicReportSearch: agrees on months and Purpose, and drops a Funding Source it never accepts", () => {
    const url = {
      fromMonth: "2026-01",
      toMonth: "2026-08",
      purpose: "purpose-1",
    };
    // On the parameters both surfaces share, the two parsers must agree —
    // that parity is why they live in one module.
    expect(parsePublicReportSearch(url)).toEqual({
      ...parseTransactionSearch(url),
      fundingSource: undefined,
    });

    // Where they deliberately differ: a share link's scope is one-dimensional
    // (ADR-0002), so the public parser drops `fundingSource` rather than
    // carrying it into a query that would ignore it anyway.
    const withPot = { ...url, fundingSource: "pot-1" };
    expect(parsePublicReportSearch(withPot)).not.toHaveProperty(
      "fundingSource"
    );
    // The control: the dashboard parser *does* keep it, so the absence above
    // is this parser's rule and not a value that failed to parse.
    expect(parseTransactionSearch(withPot).fundingSource).toBe("pot-1");
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
