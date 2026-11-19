import { describe, expect, it } from "vitest";

import {
  CSV_BOM,
  csvCell,
  csvRow,
  exportFileName,
  penceForCsv,
  toCsv,
} from "./csv";

describe("csvCell", () => {
  it("quotes plain text", () => {
    expect(csvCell("Flat 2")).toBe('"Flat 2"');
  });

  it("keeps commas and new lines inside one cell", () => {
    expect(csvCell("12 High St, Leeds")).toBe('"12 High St, Leeds"');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("doubles quotes", () => {
    expect(csvCell('The "Big" House')).toBe('"The ""Big"" House"');
  });

  it("writes empty cells for null and undefined", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it("writes Yes and No for true and false", () => {
    expect(csvCell(true)).toBe('"Yes"');
    expect(csvCell(false)).toBe('"No"');
  });

  it("writes numbers as they are", () => {
    expect(csvCell(12)).toBe('"12"');
    expect(csvCell(0)).toBe('"0"');
    expect(csvCell(Number.NaN)).toBe('""');
  });

  it.each(["=1+1", "+44 7700 900123", "-2", "@SUM(A1)", "\tx", "\rx"])(
    "stops %s from running as a spreadsheet formula",
    (value) => {
      expect(csvCell(value)).toBe(`"'${value}"`);
    },
  );

  it("does not change text that only contains those characters later", () => {
    expect(csvCell("Room 1 = front")).toBe('"Room 1 = front"');
    expect(csvCell("a@b.com")).toBe('"a@b.com"');
  });

  it("escapes a formula that also has quotes", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });
});

describe("csvRow and toCsv", () => {
  it("joins cells with commas", () => {
    expect(csvRow(["a", 1, null])).toBe('"a","1",""');
  });

  it("starts with a byte order mark and ends every line with CRLF", () => {
    const csv = toCsv(["Name", "Rent"], [["Ann", "650.00"]]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toBe(`${CSV_BOM}"Name","Rent"\r\n"Ann","650.00"\r\n`);
  });

  it("writes just the header when there are no rows", () => {
    expect(toCsv(["Name"], [])).toBe(`${CSV_BOM}"Name"\r\n`);
  });
});

describe("penceForCsv", () => {
  it.each([
    [0, "0.00"],
    [5, "0.05"],
    [65000, "650.00"],
    [65050, "650.50"],
    [100_000_000, "1000000.00"],
  ])("%d pence is %s", (pence, text) => {
    expect(penceForCsv(pence)).toBe(text);
  });

  it("refuses part pence", () => {
    expect(() => penceForCsv(1.5)).toThrow();
  });
});

describe("exportFileName", () => {
  it("names the file after the data and the day", () => {
    expect(exportFileName("tenants", "2026-11-19")).toBe(
      "tenants-2026-11-19.csv",
    );
  });
});
