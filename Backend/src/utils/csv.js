/**
 * Quote a cell; neutralise spreadsheet formula injection (but keep "+91…" phones intact).
 * @param {string | number | null | undefined} value
 */
export function cell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=@\t\r]/.test(s) || /^[+-][^\d\s]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** One CSV line of quoted, injection-safe cells. @param {Array<string | number | null | undefined>} values */
export const csvRow = (values) => values.map(cell).join(',');

/**
 * Header + rows → CSV text with a UTF-8 BOM and CRLF line endings (opens cleanly in Excel).
 * @param {string[]} headers
 * @param {Array<Array<string | number | null | undefined>>} rows
 */
export function toCsv(headers, rows) {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  return '﻿' + lines.join('\r\n') + '\r\n';
}
