/**
 * Building CSV files for the "Download your data" exports.
 *
 * - Every cell is quoted, so commas, quotes and new lines in names or notes
 *   can never break a row.
 * - A cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return is
 *   prefixed with `'`, so a spreadsheet shows it as text instead of running
 *   it as a formula ("CSV injection"). Numbers we write ourselves (money,
 *   counts) are never touched, because they are passed as numbers.
 * - Lines end with CRLF and the file starts with a byte order mark, so Excel
 *   opens it as UTF-8 and names like "Zoë" look right.
 */

export type CsvCell = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export const CSV_BOM = "﻿";

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "boolean") return value ? '"Yes"' : '"No"';
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return '""';
    return `"${String(value)}"`;
  }
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvRow(cells: readonly CsvCell[]): string {
  return cells.map(csvCell).join(",");
}

/** The whole file: byte order mark, header row, then one row per record. */
export function toCsv(
  header: readonly string[],
  rows: readonly (readonly CsvCell[])[],
): string {
  const lines = [csvRow(header), ...rows.map(csvRow)];
  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
}

/**
 * Whole pence as pounds with two decimals for a spreadsheet: 65050 ->
 * "650.50". Integer maths only, never floats. No "£" or commas, so a
 * spreadsheet reads it as a number.
 */
export function penceForCsv(pence: number): string {
  if (!Number.isInteger(pence)) {
    throw new Error("penceForCsv expects whole pence");
  }
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  const pounds = Math.trunc(abs / 100);
  const rest = abs % 100;
  return `${sign}${pounds}.${String(rest).padStart(2, "0")}`;
}

/** "homes-2026-11-19.csv" */
export function exportFileName(kind: string, today: string): string {
  return `${kind}-${today}.csv`;
}
