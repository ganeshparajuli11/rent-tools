import { describe, expect, it } from "vitest";

import { cleanSearchTerm, searchQuerySchema } from "./search";

describe("cleanSearchTerm", () => {
  it("keeps letters, numbers, spaces and simple marks", () => {
    expect(cleanSearchTerm("Sample House 01")).toBe("Sample House 01");
    expect(cleanSearchTerm("O'Brien-Example")).toBe("O'Brien-Example");
    expect(cleanSearchTerm("Flat 3. Demo & Co")).toBe("Flat 3. Demo & Co");
    expect(cleanSearchTerm("Zoë")).toBe("Zoë");
  });

  it("removes anything that could change a query filter", () => {
    expect(cleanSearchTerm('a,b(c)"d\\e%f_g*h:i')).toBe("a b c d e f g h i");
    expect(cleanSearchTerm("name.eq.x,id.neq.y")).toBe("name.eq.x id.neq.y");
  });

  it("squeezes spaces and trims", () => {
    expect(cleanSearchTerm("  LS6   1AA \n")).toBe("LS6 1AA");
  });

  it("keeps at most 80 characters", () => {
    expect(cleanSearchTerm("x".repeat(200))).toHaveLength(80);
  });
});

describe("searchQuerySchema", () => {
  it("accepts a short search", () => {
    const parsed = searchQuerySchema.safeParse({ query: " Oak " });
    expect(parsed.success && parsed.data.query).toBe("Oak");
  });

  it("needs at least two letters or numbers after cleaning", () => {
    expect(searchQuerySchema.safeParse({ query: "a" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ query: ",,(" }).success).toBe(false);
  });

  it("rejects anything that is not text", () => {
    expect(searchQuerySchema.safeParse({ query: 12 }).success).toBe(false);
    expect(searchQuerySchema.safeParse({}).success).toBe(false);
  });
});
