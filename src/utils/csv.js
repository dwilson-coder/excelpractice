/** RFC-4180 CSV/TSV parsing and serialising. */
export function parseDelimited(text, delimiter = ",") {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === "") inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function toDelimited(rows, delimiter = ",") {
  const needsQuote = new RegExp(`["\\n\\r${delimiter === "\t" ? "\\t" : delimiter}]`);
  const esc = (s) => {
    s = String(s ?? "");
    return needsQuote.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(delimiter)).join("\r\n");
}

/** Guess delimiter from the first line. */
export function sniffDelimiter(text) {
  const first = text.split(/\r?\n/, 1)[0] || "";
  const counts = { ",": 0, "\t": 0, ";": 0 };
  for (const ch of first) if (ch in counts) counts[ch]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
