/** Import / export plumbing: xlsx, csv/tsv, native JSON, encrypted .xpenc. */
import { workbookToXlsx, xlsxToWorkbook } from "./xlsx";
import { parseDelimited, toDelimited, sniffDelimiter } from "../utils/csv";
import { createEvaluator } from "../utils/formulaEngine";
import { formatValue } from "../utils/format";
import { createSheet, normalizeWorkbook, usedRange, key } from "./model";
import { encryptBytes, decryptBytes } from "./crypto";
import { ROWS, COLS } from "../utils/constants";

export function download(data, filename, mime = "application/octet-stream") {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const safeFile = (name) => (name || "workbook").replace(/[\\/:*?"<>|]+/g, "_").trim() || "workbook";

export async function exportXlsx(doc, name) {
  download(await workbookToXlsx(doc), `${safeFile(name)}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function sheetToRows(sheet, evaluator) {
  const used = usedRange(sheet);
  if (!used) return [];
  const rows = [];
  for (let r = 0; r <= used.r2; r++) {
    const row = [];
    for (let c = 0; c <= used.c2; c++) row.push(formatValue(evaluator.value(sheet.id, r, c), sheet.styles[key(r, c)]));
    rows.push(row);
  }
  return rows;
}

export function exportCsv(sheet, name, delimiter = ",") {
  const text = toDelimited(sheetToRows(sheet, createEvaluator([sheet])), delimiter);
  download("﻿" + text, `${safeFile(name)}.${delimiter === "\t" ? "tsv" : "csv"}`, "text/csv;charset=utf-8");
}

export const exportJson = (doc, name) => download(JSON.stringify({ v: 1, ...doc }, null, 2), `${safeFile(name)}.xpractice.json`, "application/json");

export async function exportEncrypted(doc, name, password) {
  download(await encryptBytes(new TextEncoder().encode(JSON.stringify({ v: 1, ...doc })), password), `${safeFile(name)}.xpenc`);
}

export function csvToWorkbook(text, name = "Sheet1") {
  const rows = parseDelimited(text, sniffDelimiter(text));
  const sheet = createSheet(name);
  let dropped = false;
  rows.forEach((row, r) =>
    row.forEach((v, c) => {
      if (r >= ROWS || c >= COLS) {
        if (v !== "") dropped = true;
        return;
      }
      if (v !== "") sheet.cells[key(r, c)] = v;
    })
  );
  return { workbook: { sheets: [sheet], activeSheetId: sheet.id }, warnings: dropped ? [`Data outside A1:Z${ROWS} was not imported.`] : [] };
}

export const needsPassword = (name) => /\.xpenc$/i.test(name);

/** @returns {Promise<{workbook, warnings:string[], title:string}>} */
export async function readFile(file, password) {
  const name = file.name;
  const title = name.replace(/\.[^.]+$/, "").replace(/\.xpractice$/i, "");
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
    const { workbook, warnings } = await xlsxToWorkbook(new Uint8Array(await file.arrayBuffer()));
    return { workbook, warnings, title };
  }
  if (lower.endsWith(".xls")) throw new Error("Legacy .xls files aren't supported. In Excel choose Save As → Excel Workbook (.xlsx), or export as CSV.");
  if (lower.endsWith(".xpenc")) {
    const plain = await decryptBytes(new Uint8Array(await file.arrayBuffer()), password);
    return { workbook: normalizeWorkbook(JSON.parse(new TextDecoder().decode(plain))), warnings: [], title };
  }
  if (lower.endsWith(".json")) return { workbook: normalizeWorkbook(JSON.parse(await file.text())), warnings: [], title };
  if (/\.(csv|tsv|txt)$/.test(lower)) return { ...csvToWorkbook(await file.text(), "Sheet1"), title };
  throw new Error("Unsupported file type. Use .xlsx, .csv, .tsv, .json or an encrypted .xpenc file.");
}
