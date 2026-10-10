import { isError, serialToDate } from "./formulaEngine";

export const NUMBER_FORMATS = [
  { id: "general", label: "General", example: "1234.5" },
  { id: "number", label: "Number", example: "1234.50" },
  { id: "comma", label: "Number with commas", example: "1,234.50" },
  { id: "currency", label: "Currency", example: "$1,234.50" },
  { id: "percent", label: "Percentage", example: "12.30%" },
  { id: "date", label: "Date", example: "2026-10-09" },
  { id: "text", label: "Text", example: "@" },
];

const defaultDec = (nf) => (nf === "general" || nf === "text" || nf === "date" ? 0 : 2);
export const decimalsFor = (style) => style?.dec ?? defaultDec(style?.nf ?? "general");

/** Excel number-format code for a cell style (used by the XLSX writer). */
export function numFmtCode(style) {
  const nf = style?.nf ?? "general";
  const dec = decimalsFor(style);
  const zeros = dec > 0 ? "." + "0".repeat(dec) : "";
  switch (nf) {
    case "number": return `0${zeros}`;
    case "comma": return `#,##0${zeros}`;
    case "currency": return `"$"#,##0${zeros}`;
    case "percent": return `0${zeros}%`;
    case "date": return "yyyy-mm-dd";
    case "text": return "@";
    default: return style?.dec !== undefined ? `0${zeros}` : "General";
  }
}

const BUILTIN = { 0: "General", 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00", 9: "0%", 10: "0.00%", 14: "yyyy-mm-dd", 15: "d-mmm-yy", 16: "d-mmm", 17: "mmm-yy", 22: "yyyy-mm-dd hh:mm", 49: "@" };

/** Reverse of numFmtCode — tolerant of arbitrary Excel codes. */
export function parseNumFmt(codeOrId, customFormats = {}) {
  const code = typeof codeOrId === "number" || /^\d+$/.test(String(codeOrId)) ? customFormats[codeOrId] ?? BUILTIN[codeOrId] ?? "General" : String(codeOrId);
  if (code === "General") return {};
  const clean = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "");
  const dec = (clean.split(".")[1] || "").replace(/[^0#]/g, "").length;
  if (code === "@") return { nf: "text" };
  if (/[ymdh]/i.test(clean) && !/0|#/.test(clean)) return { nf: "date" };
  if (clean.includes("%")) return { nf: "percent", dec };
  if (/\$|€|£|¥/.test(code)) return { nf: "currency", dec };
  if (clean.includes(",")) return { nf: "comma", dec };
  return { nf: "number", dec };
}

/** Format a computed value for display according to a cell style. */
export function formatValue(v, style) {
  if (v === null || v === undefined) return "";
  if (isError(v)) return v.code;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "string") return v;
  const nf = style?.nf ?? "general";
  const dec = decimalsFor(style);
  switch (nf) {
    case "number": return v.toFixed(dec);
    case "comma": return v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    case "currency": return (v < 0 ? "-" : "") + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    case "percent": return (v * 100).toFixed(dec) + "%";
    case "date": {
      const d = serialToDate(v);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }
    case "text": return String(v);
    default:
      return style?.dec !== undefined ? v.toFixed(style.dec) : String(Number(v.toPrecision(12)));
  }
}
