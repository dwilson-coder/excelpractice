/** Data validation + conditional formatting evaluation. */
import { parseRangeRef, isError } from "../utils/formulaEngine";
import { inRange } from "./ops";

const rangeCache = new Map();
export function rangeOf(text) {
  if (!rangeCache.has(text)) rangeCache.set(text, parseRangeRef(text));
  return rangeCache.get(text);
}

function opTest(op, x, a, b) {
  switch (op) {
    case "gt": return x > a;
    case "lt": return x < a;
    case "eq": return x === a;
    case "ne": return x !== a;
    case "ge": return x >= a;
    case "le": return x <= a;
    case "notBetween": return x < a || x > b;
    default: return x >= a && x <= b;
  }
}

export const OP_LABELS = { between: "between", notBetween: "not between", gt: "greater than", lt: "less than", ge: "greater than or equal to", le: "less than or equal to", eq: "equal to", ne: "not equal to" };

function defaultMessage(rule) {
  if (rule.type === "list") return `Value must be one of: ${rule.list}`;
  const what = rule.type === "whole" ? "whole number" : rule.type === "decimal" ? "number" : "text length";
  const rhs = rule.op === "between" || rule.op === "notBetween" ? `${rule.v1} and ${rule.v2}` : rule.v1;
  return `Enter a ${what} ${OP_LABELS[rule.op] || ""} ${rhs}`.trim();
}

/** @returns {string|null} error message when `value` violates a rule covering (r,c) */
export function validate(sheet, r, c, value) {
  if (value === "" || value == null) return null;
  for (const rule of sheet.validations) {
    const rng = rangeOf(rule.range);
    if (!rng || !inRange(rng, r, c)) continue;
    if (typeof value === "string" && value[0] === "=") continue;
    const msg = rule.message || defaultMessage(rule);
    if (rule.type === "list") {
      const items = (rule.list || "").split(",").map((s) => s.trim().toLowerCase());
      if (!items.includes(String(value).trim().toLowerCase())) return msg;
    } else if (rule.type === "whole" || rule.type === "decimal") {
      const n = Number(value);
      if (String(value).trim() === "" || isNaN(n)) return msg;
      if (rule.type === "whole" && !Number.isInteger(n)) return msg;
      if (!opTest(rule.op, n, Number(rule.v1), Number(rule.v2))) return msg;
    } else if (rule.type === "textLength") {
      if (!opTest(rule.op, String(value).length, Number(rule.v1), Number(rule.v2))) return msg;
    }
  }
  return null;
}

export function listFor(sheet, r, c) {
  for (const rule of sheet.validations) {
    if (rule.type !== "list") continue;
    const rng = rangeOf(rule.range);
    if (rng && inRange(rng, r, c)) return (rule.list || "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  return null;
}

const mix = (a, b, t) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

/** "r,c" → style patch from conditional-format rules; computed once per render. */
export function computeConditionalStyles(sheet, valueAt) {
  const out = {};
  const apply = (r, c, patch) => {
    out[`${r},${c}`] = { ...(out[`${r},${c}`] || {}), ...patch };
  };
  for (const rule of sheet.cf) {
    const rng = rangeOf(rule.range);
    if (!rng) continue;
    const cells = [];
    for (let r = rng.r1; r <= rng.r2; r++) for (let c = rng.c1; c <= rng.c2; c++) cells.push([r, c, valueAt(r, c)]);

    if (rule.type === "scale") {
      const nums = cells.filter(([, , v]) => typeof v === "number");
      if (!nums.length) continue;
      const lo = Math.min(...nums.map((x) => x[2]));
      const hi = Math.max(...nums.map((x) => x[2]));
      const [c1, c2] = rule.colors || ["#ffffff", "#63be7b"];
      for (const [r, c, v] of nums) apply(r, c, { bg: mix(c1, c2, hi === lo ? 1 : (v - lo) / (hi - lo)) });
    } else if (rule.type === "duplicates") {
      const counts = new Map();
      for (const [, , v] of cells) if (v !== null && !isError(v)) counts.set(String(v).toLowerCase(), (counts.get(String(v).toLowerCase()) || 0) + 1);
      for (const [r, c, v] of cells) if (v !== null && counts.get(String(v).toLowerCase()) > 1) apply(r, c, rule.style || {});
    } else if (rule.type === "text") {
      const n = String(rule.v1 ?? "").toLowerCase();
      for (const [r, c, v] of cells) if (n && v !== null && !isError(v) && String(v).toLowerCase().includes(n)) apply(r, c, rule.style || {});
    } else if (rule.type === "cellIs") {
      const a = Number(rule.v1);
      const b = Number(rule.v2);
      const numeric = rule.v1 !== "" && !isNaN(a);
      for (const [r, c, v] of cells) {
        if (v === null || isError(v)) continue;
        let hit = false;
        if (numeric && typeof v === "number") hit = opTest(rule.op, v, a, b);
        else if (!numeric) {
          const s = String(v).toLowerCase();
          const t = String(rule.v1).toLowerCase();
          hit = rule.op === "eq" ? s === t : rule.op === "ne" ? s !== t : false;
        }
        if (hit) apply(r, c, rule.style || {});
      }
    }
  }
  return out;
}
