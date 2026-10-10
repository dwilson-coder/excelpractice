/**
 * Formula engine: tokenizer → parser → evaluator.
 * Nested functions, operators (+ - * / ^ & = <> < > <= >= %), absolute refs ($A$1),
 * ranges, cross-sheet refs (Sheet2!A1, 'My Sheet'!A1:B2), strings, booleans, error values.
 */

// ─── Errors ──────────────────────────────────────────────────────────
export class XlError {
  constructor(code) {
    this.code = code;
  }
  toString() {
    return this.code;
  }
}
const E = (c) => new XlError(c);
export const isError = (v) => v instanceof XlError;

// ─── Address helpers ─────────────────────────────────────────────────
export function colToLetters(col) {
  let letters = "";
  let c = col;
  while (c >= 0) {
    letters = String.fromCharCode((c % 26) + 65) + letters;
    c = Math.floor(c / 26) - 1;
  }
  return letters;
}

export function lettersToCol(letters) {
  let col = 0;
  for (const ch of letters.toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return col - 1;
}

/** { row: 0, col: 0 } → "A1" */
export function toCellRef(row, col) {
  return `${colToLetters(col)}${row + 1}`;
}

/** "A1" / "$A$1" → { row, col } (0-based). Throws on invalid input. */
export function parseCellRef(ref) {
  const m = String(ref).trim().match(/^\$?([A-Za-z]{1,3})\$?(\d+)$/);
  if (!m) throw new Error(`Invalid cell reference: ${ref}`);
  return { row: parseInt(m[2], 10) - 1, col: lettersToCol(m[1]) };
}

/** "A1:B10" (or "A1") → normalised { r1, c1, r2, c2 }, or null if invalid. */
export function parseRangeRef(text) {
  try {
    const [a, b] = String(text).split(":");
    const p1 = parseCellRef(a);
    const p2 = b !== undefined ? parseCellRef(b) : p1;
    return { r1: Math.min(p1.row, p2.row), c1: Math.min(p1.col, p2.col), r2: Math.max(p1.row, p2.row), c2: Math.max(p1.col, p2.col) };
  } catch {
    return null;
  }
}

export function rangeToA1({ r1, c1, r2, c2 }) {
  const a = toCellRef(r1, c1);
  return r1 === r2 && c1 === c2 ? a : `${a}:${toCellRef(r2, c2)}`;
}

// ─── Tokenizer ───────────────────────────────────────────────────────
const SHEET = `(?:(?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!)?`;
const RE = {
  ws: /\s+/y,
  str: /"(?:[^"]|"")*"/y,
  ref: new RegExp(`${SHEET}\\$?[A-Za-z]{1,3}\\$?\\d+(?::\\$?[A-Za-z]{1,3}\\$?\\d+)?(?![A-Za-z0-9_(])`, "y"),
  num: /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y,
  name: /[A-Za-z_][A-Za-z0-9_.]*/y,
  op: /<=|>=|<>|[-+*/^&=<>%]/y,
};

function match(re, s, i) {
  re.lastIndex = i;
  const m = re.exec(s);
  return m ? m[0] : null;
}

export function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    let t;
    if ((t = match(RE.ws, src, i))) {
      i += t.length;
      continue;
    }
    const start = i;
    if ((t = match(RE.str, src, i))) {
      tokens.push({ type: "str", value: t.slice(1, -1).replace(/""/g, '"'), start, end: i + t.length });
    } else if ((t = match(RE.ref, src, i))) {
      tokens.push({ type: "ref", value: t, start, end: i + t.length });
    } else if ((t = match(RE.num, src, i))) {
      tokens.push({ type: "num", value: parseFloat(t), start, end: i + t.length });
    } else if ((t = match(RE.name, src, i))) {
      const up = t.toUpperCase();
      if (up === "TRUE" || up === "FALSE") tokens.push({ type: "bool", value: up === "TRUE", start, end: i + t.length });
      else tokens.push({ type: "name", value: up, start, end: i + t.length });
    } else if ((t = match(RE.op, src, i))) {
      tokens.push({ type: "op", value: t, start, end: i + t.length });
    } else if (src[i] === "(") {
      t = "(";
      tokens.push({ type: "lp", start, end: i + 1 });
    } else if (src[i] === ")") {
      t = ")";
      tokens.push({ type: "rp", start, end: i + 1 });
    } else if (src[i] === "," || src[i] === ";") {
      t = src[i];
      tokens.push({ type: "comma", start, end: i + 1 });
    } else {
      throw E("#NAME?");
    }
    i += t.length;
  }
  return tokens;
}

// ─── Reference token parsing / rewriting ─────────────────────────────
function splitSheet(text) {
  const bang = text.lastIndexOf("!");
  if (bang === -1) return { sheet: null, body: text, prefix: "" };
  let sheet = text.slice(0, bang);
  const prefix = sheet + "!";
  if (sheet.startsWith("'")) sheet = sheet.slice(1, -1).replace(/''/g, "'");
  return { sheet, body: text.slice(bang + 1), prefix };
}

function parsePart(part) {
  const m = part.match(/^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/);
  return { cAbs: !!m[1], col: lettersToCol(m[2]), rAbs: !!m[3], row: parseInt(m[4], 10) - 1 };
}

const partToString = (p) => `${p.cAbs ? "$" : ""}${colToLetters(p.col)}${p.rAbs ? "$" : ""}${p.row + 1}`;

/** Rewrite every cell reference in a formula. fn(part, {isRangeEnd}) → new part, or null for #REF!. */
export function transformRefs(formula, fn) {
  if (typeof formula !== "string" || formula[0] !== "=") return formula;
  const body = formula.slice(1);
  let tokens;
  try {
    tokens = tokenize(body);
  } catch {
    return formula;
  }
  let out = "";
  let last = 0;
  for (const t of tokens) {
    if (t.type !== "ref") continue;
    const { prefix, body: refBody } = splitSheet(body.slice(t.start, t.end));
    const mapped = refBody.split(":").map(parsePart).map((p, idx) => fn({ ...p }, { isRangeEnd: idx === 1 }));
    out += body.slice(last, t.start);
    out += mapped.some((m) => m === null) ? "#REF!" : prefix + mapped.map(partToString).join(":");
    last = t.end;
  }
  return "=" + out + body.slice(last);
}

/** Relative-reference adjustment used by copy/paste, fill and sort. */
export function shiftFormula(formula, dr, dc) {
  return transformRefs(formula, (p) => {
    const row = p.rAbs ? p.row : p.row + dr;
    const col = p.cAbs ? p.col : p.col + dc;
    return row < 0 || col < 0 ? null : { ...p, row, col };
  });
}

/** Insert (delta>0) / delete (delta<0) rows or columns — references follow the data. */
export function adjustForStructure(formula, axis, index, delta) {
  return transformRefs(formula, (p, { isRangeEnd }) => {
    const k = axis === "row" ? "row" : "col";
    const v = p[k];
    if (delta > 0) {
      if (v >= index) p[k] = v + delta;
    } else {
      const n = -delta;
      if (v >= index && v < index + n) {
        if (isRangeEnd) p[k] = Math.max(index - 1, 0);
        else return null;
      } else if (v >= index + n) p[k] = v - n;
    }
    return p;
  });
}

// ─── Parser ──────────────────────────────────────────────────────────
const CMP = new Set(["=", "<>", "<", ">", "<=", ">="]);

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const isOp = (t, ...ops) => t && t.type === "op" && ops.includes(t.value);

  const level = (sub, ...ops) => () => {
    let left = sub();
    while (isOp(peek(), ...ops)) {
      const op = next().value;
      left = { t: "bin", op, l: left, r: sub() };
    }
    return left;
  };

  function parseCompare() {
    let left = parseConcat();
    while (peek() && peek().type === "op" && CMP.has(peek().value)) {
      const op = next().value;
      left = { t: "bin", op, l: left, r: parseConcat() };
    }
    return left;
  }
  const parseConcat = level(() => parseAdd(), "&");
  const parseAdd = level(() => parseMul(), "+", "-");
  const parseMul = level(() => parsePow(), "*", "/");
  const parsePow = level(() => parseUnary(), "^");
  function parseUnary() {
    if (isOp(peek(), "-", "+")) {
      const op = next().value;
      return { t: "un", op, e: parseUnary() };
    }
    let e = parsePrimary();
    while (isOp(peek(), "%")) {
      next();
      e = { t: "pct", e };
    }
    return e;
  }
  function parsePrimary() {
    const tk = next();
    if (!tk) throw E("#NAME?");
    switch (tk.type) {
      case "num":
      case "str":
      case "bool":
        return { t: "lit", v: tk.value };
      case "ref": {
        const { sheet, body } = splitSheet(tk.value);
        const parts = body.split(":").map(parsePart);
        if (parts.length === 1) return { t: "ref", sheet, row: parts[0].row, col: parts[0].col };
        return {
          t: "range",
          sheet,
          r1: Math.min(parts[0].row, parts[1].row),
          c1: Math.min(parts[0].col, parts[1].col),
          r2: Math.max(parts[0].row, parts[1].row),
          c2: Math.max(parts[0].col, parts[1].col),
        };
      }
      case "name": {
        if (peek()?.type !== "lp") throw E("#NAME?");
        next();
        const args = [];
        if (peek()?.type === "rp") next();
        else
          for (;;) {
            if (peek()?.type === "comma" || peek()?.type === "rp") args.push({ t: "empty" });
            else args.push(parseCompare());
            const sep = next();
            if (!sep) throw E("#NAME?");
            if (sep.type === "rp") break;
            if (sep.type !== "comma") throw E("#NAME?");
          }
        return { t: "call", name: tk.value, args };
      }
      case "lp": {
        const e = parseCompare();
        if (next()?.type !== "rp") throw E("#NAME?");
        return e;
      }
      default:
        throw E("#NAME?");
    }
  }

  const ast = parseCompare();
  if (pos < tokens.length) throw E("#NAME?");
  return ast;
}

const parseCache = new Map();
function parseFormula(src) {
  if (parseCache.has(src)) {
    const hit = parseCache.get(src);
    if (hit instanceof XlError) throw hit;
    return hit;
  }
  try {
    const ast = parse(tokenize(src));
    if (parseCache.size > 5000) parseCache.clear();
    parseCache.set(src, ast);
    return ast;
  } catch (e) {
    const err = e instanceof XlError ? e : E("#NAME?");
    parseCache.set(src, err);
    throw err;
  }
}

// ─── Coercion helpers ────────────────────────────────────────────────
const NUM_RE = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;

/** Convert raw cell text into a typed value (number | boolean | string | null). */
export function parseLiteral(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return raw;
  if (raw[0] === "'") return raw.slice(1);
  const t = raw.trim();
  if (NUM_RE.test(t)) return parseFloat(t);
  if (/^[-+]?(\d+\.?\d*|\.\d+)%$/.test(t)) return parseFloat(t) / 100;
  const up = t.toUpperCase();
  if (up === "TRUE") return true;
  if (up === "FALSE") return false;
  return raw;
}

const sc = (v) => (Array.isArray(v) ? (v.length ? v[0][0] ?? null : null) : v);

function toNum(v) {
  v = sc(v);
  if (isError(v)) throw v;
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const t = String(v).trim();
  if (NUM_RE.test(t)) return parseFloat(t);
  throw E("#VALUE!");
}

function toStr(v) {
  v = sc(v);
  if (isError(v)) throw v;
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(Number(v.toPrecision(15)));
  return String(v);
}

function toBool(v) {
  v = sc(v);
  if (isError(v)) throw v;
  if (typeof v === "boolean") return v;
  if (v === null || v === undefined || v === "") return false;
  if (typeof v === "number") return v !== 0;
  const u = String(v).toUpperCase();
  if (u === "TRUE") return true;
  if (u === "FALSE") return false;
  throw E("#VALUE!");
}

const typeRank = (v) => (typeof v === "number" ? 1 : typeof v === "string" ? 2 : typeof v === "boolean" ? 3 : 0);

function compare(a, b) {
  a = sc(a);
  b = sc(b);
  if (isError(a)) throw a;
  if (isError(b)) throw b;
  if (a === null || a === undefined) a = typeof b === "string" ? "" : typeof b === "boolean" ? false : 0;
  if (b === null || b === undefined) b = typeof a === "string" ? "" : typeof a === "boolean" ? false : 0;
  const ra = typeRank(a);
  const rb = typeRank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (ra === 2) {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

function numbersIn(args, { direct = true } = {}) {
  const out = [];
  for (const a of args) {
    if (Array.isArray(a)) {
      for (const row of a)
        for (const v of row) {
          if (isError(v)) throw v;
          if (typeof v === "number") out.push(v);
        }
    } else if (direct) out.push(toNum(a));
  }
  return out;
}

/** Build a predicate from an Excel criteria value (">5", "apple*", 3, …). */
function makeCriteria(crit) {
  crit = sc(crit);
  let op = "=";
  let operand = crit;
  if (typeof crit === "string") {
    const m = crit.match(/^(<=|>=|<>|=|<|>)(.*)$/s);
    if (m) {
      op = m[1];
      operand = m[2];
    }
    const lit = parseLiteral(operand);
    operand = lit === null ? "" : lit;
  }
  return (v) => {
    v = sc(v);
    if (isError(v)) return false;
    if (typeof operand === "string" && /[*?]/.test(operand) && (op === "=" || op === "<>")) {
      const re = new RegExp("^" + operand.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
      const hit = re.test(v === null ? "" : String(v));
      return op === "=" ? hit : !hit;
    }
    if (v === null && operand === "") return op === "=";
    if (typeof operand === "number" && typeof v !== "number") return op === "<>";
    if (typeof operand === "string" && typeof v !== "string" && v !== null) return op === "<>";
    const c = compare(v === null ? (typeof operand === "number" ? 0 : "") : v, operand);
    switch (op) {
      case "=": return c === 0;
      case "<>": return c !== 0;
      case "<": return c < 0;
      case ">": return c > 0;
      case "<=": return c <= 0;
      default: return c >= 0;
    }
  };
}

const flat = (a) => (Array.isArray(a) ? a.flat() : [a]);
const round = (n, d, mode) => {
  const f = 10 ** d;
  const x = n * f;
  const ax = Math.abs(x);
  const r = mode === "up" ? Math.ceil(ax - 1e-12) : mode === "down" ? Math.floor(ax + 1e-12) : Math.round(ax + 1e-12);
  return (Math.sign(x) * r) / f;
};

// Excel serial dates
const EPOCH = Date.UTC(1899, 11, 30);
export const dateToSerial = (d) => (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000;
export const serialToDate = (n) => new Date(EPOCH + Math.floor(n) * 86400000 + (n % 1) * 86400000);

// ─── Function library ────────────────────────────────────────────────
const LAZY = {
  IF: (nodes, ev) => {
    if (nodes.length < 2) throw E("#VALUE!");
    if (toBool(ev(nodes[0]))) return ev(nodes[1]);
    return nodes[2] ? ev(nodes[2]) : false;
  },
  IFERROR: (nodes, ev) => {
    try {
      const v = sc(ev(nodes[0]));
      if (isError(v)) return nodes[1] ? ev(nodes[1]) : "";
      return v;
    } catch (e) {
      if (e instanceof XlError) return nodes[1] ? ev(nodes[1]) : "";
      throw e;
    }
  },
  IFNA: (nodes, ev) => {
    try {
      const v = sc(ev(nodes[0]));
      if (isError(v) && v.code === "#N/A") return ev(nodes[1]);
      return v;
    } catch (e) {
      if (e instanceof XlError && e.code === "#N/A") return ev(nodes[1]);
      throw e;
    }
  },
  IFS: (nodes, ev) => {
    for (let i = 0; i + 1 < nodes.length; i += 2) if (toBool(ev(nodes[i]))) return ev(nodes[i + 1]);
    throw E("#N/A");
  },
};

const FN = {
  // Math & statistics
  SUM: (a) => numbersIn(a).reduce((x, y) => x + y, 0),
  AVERAGE: (a) => {
    const n = numbersIn(a);
    if (!n.length) throw E("#DIV/0!");
    return n.reduce((x, y) => x + y, 0) / n.length;
  },
  COUNT: (a) => numbersIn(a, { direct: false }).length + a.filter((x) => !Array.isArray(x) && typeof x === "number").length,
  COUNTA: (a) => a.flatMap(flat).filter((v) => v !== null && v !== undefined && v !== "").length,
  COUNTBLANK: (a) => a.flatMap(flat).filter((v) => v === null || v === "").length,
  MAX: (a) => {
    const n = numbersIn(a);
    return n.length ? Math.max(...n) : 0;
  },
  MIN: (a) => {
    const n = numbersIn(a);
    return n.length ? Math.min(...n) : 0;
  },
  MEDIAN: (a) => {
    const n = numbersIn(a).sort((x, y) => x - y);
    if (!n.length) throw E("#NUM!");
    const m = Math.floor(n.length / 2);
    return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2;
  },
  PRODUCT: (a) => numbersIn(a).reduce((x, y) => x * y, 1),
  ROUND: ([n, d]) => round(toNum(n), d === undefined ? 0 : toNum(d)),
  ROUNDUP: ([n, d]) => round(toNum(n), d === undefined ? 0 : toNum(d), "up"),
  ROUNDDOWN: ([n, d]) => round(toNum(n), d === undefined ? 0 : toNum(d), "down"),
  INT: ([n]) => Math.floor(toNum(n)),
  ABS: ([n]) => Math.abs(toNum(n)),
  SQRT: ([n]) => {
    const x = toNum(n);
    if (x < 0) throw E("#NUM!");
    return Math.sqrt(x);
  },
  POWER: ([a, b]) => toNum(a) ** toNum(b),
  MOD: ([a, b]) => {
    const d = toNum(b);
    if (d === 0) throw E("#DIV/0!");
    const n = toNum(a);
    return n - d * Math.floor(n / d);
  },
  PI: () => Math.PI,
  SUMPRODUCT: (a) => {
    const arrays = a.map((x) => flat(x).map((v) => (typeof v === "number" ? v : 0)));
    const len = arrays[0]?.length ?? 0;
    if (arrays.some((x) => x.length !== len)) throw E("#VALUE!");
    let total = 0;
    for (let i = 0; i < len; i++) total += arrays.reduce((p, x) => p * x[i], 1);
    return total;
  },
  SUMIF: ([range, crit, sumRange]) => {
    const test = makeCriteria(crit);
    const r = flat(range);
    const s = sumRange ? flat(sumRange) : r;
    return r.reduce((t, v, i) => (test(v) && typeof s[i] === "number" ? t + s[i] : t), 0);
  },
  COUNTIF: ([range, crit]) => flat(range).filter(makeCriteria(crit)).length,
  AVERAGEIF: ([range, crit, avgRange]) => {
    const test = makeCriteria(crit);
    const r = flat(range);
    const s = avgRange ? flat(avgRange) : r;
    const hits = r.map((v, i) => (test(v) && typeof s[i] === "number" ? s[i] : null)).filter((v) => v !== null);
    if (!hits.length) throw E("#DIV/0!");
    return hits.reduce((x, y) => x + y, 0) / hits.length;
  },

  // Logic
  AND: (a) => a.flatMap(flat).filter((v) => v !== null && v !== "").every(toBool),
  OR: (a) => a.flatMap(flat).filter((v) => v !== null && v !== "").some(toBool),
  NOT: ([v]) => !toBool(v),
  ISBLANK: ([v]) => sc(v) === null,
  ISNUMBER: ([v]) => typeof sc(v) === "number",
  ISTEXT: ([v]) => typeof sc(v) === "string",
  ISERROR: ([v]) => isError(sc(v)),

  // Text
  CONCAT: (a) => a.flatMap(flat).map(toStr).join(""),
  CONCATENATE: (a) => a.flatMap(flat).map(toStr).join(""),
  LEN: ([v]) => toStr(v).length,
  UPPER: ([v]) => toStr(v).toUpperCase(),
  LOWER: ([v]) => toStr(v).toLowerCase(),
  PROPER: ([v]) => toStr(v).toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_, p, c) => p + c.toUpperCase()),
  TRIM: ([v]) => toStr(v).trim().replace(/\s+/g, " "),
  LEFT: ([v, n]) => toStr(v).slice(0, n === undefined ? 1 : toNum(n)),
  RIGHT: ([v, n]) => {
    const k = n === undefined ? 1 : toNum(n);
    return k === 0 ? "" : toStr(v).slice(-k);
  },
  MID: ([v, start, n]) => toStr(v).substr(toNum(start) - 1, toNum(n)),
  SUBSTITUTE: ([v, from, to]) => toStr(v).split(toStr(from)).join(toStr(to)),
  FIND: ([needle, hay, start]) => {
    const i = toStr(hay).indexOf(toStr(needle), start === undefined ? 0 : toNum(start) - 1);
    if (i < 0) throw E("#VALUE!");
    return i + 1;
  },
  SEARCH: ([needle, hay]) => {
    const i = toStr(hay).toLowerCase().indexOf(toStr(needle).toLowerCase());
    if (i < 0) throw E("#VALUE!");
    return i + 1;
  },
  VALUE: ([v]) => toNum(v),
  TEXT: ([v, fmt]) => {
    const n = toNum(v);
    const f = toStr(fmt);
    const dec = (f.split(".")[1] || "").replace(/[^0#]/g, "").length;
    if (f.includes("%")) return (n * 100).toFixed(dec) + "%";
    const s = n.toFixed(dec);
    return f.includes(",") ? Number(s).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : s;
  },

  // Lookup
  VLOOKUP: ([key, table, col, approx]) => {
    if (!Array.isArray(table)) throw E("#VALUE!");
    const idx = toNum(col) - 1;
    if (idx < 0 || idx >= (table[0]?.length ?? 0)) throw E("#REF!");
    const exact = approx !== undefined && !toBool(approx);
    const k = sc(key);
    if (exact) {
      const row = table.find((r) => r[0] !== null && typeRank(r[0]) === typeRank(k) && compare(r[0], k) === 0);
      if (!row) throw E("#N/A");
      return row[idx];
    }
    let best = null;
    for (const r of table) {
      if (r[0] === null || typeRank(r[0]) !== typeRank(k)) continue;
      if (compare(r[0], k) <= 0) best = r;
      else break;
    }
    if (!best) throw E("#N/A");
    return best[idx];
  },
  HLOOKUP: ([key, table, row, approx]) => {
    if (!Array.isArray(table)) throw E("#VALUE!");
    const idx = toNum(row) - 1;
    const exact = approx !== undefined && !toBool(approx);
    const k = sc(key);
    const header = table[0];
    let hit = -1;
    for (let i = 0; i < header.length; i++) {
      if (header[i] === null || typeRank(header[i]) !== typeRank(k)) continue;
      const c = compare(header[i], k);
      if (exact ? c === 0 : c <= 0) hit = i;
      if (exact && c === 0) break;
    }
    if (hit < 0 || idx >= table.length) throw E("#N/A");
    return table[idx][hit];
  },
  XLOOKUP: ([key, lookup, ret, ifNotFound]) => {
    const l = flat(lookup);
    const r = flat(ret);
    const k = sc(key);
    const i = l.findIndex((v) => v !== null && typeRank(v) === typeRank(k) && compare(v, k) === 0);
    if (i >= 0) return r[i] ?? null;
    if (ifNotFound !== undefined) return sc(ifNotFound);
    throw E("#N/A");
  },
  INDEX: ([arr, r, c]) => {
    if (!Array.isArray(arr)) return arr;
    const row = r === undefined ? 1 : toNum(r);
    const col = c === undefined ? 1 : toNum(c);
    let v;
    if (arr.length === 1 && c === undefined) v = arr[0][row - 1];
    else v = arr[(row || 1) - 1]?.[(col || 1) - 1];
    if (v === undefined) throw E("#REF!");
    return v;
  },
  MATCH: ([key, arr, type]) => {
    const list = flat(arr);
    const k = sc(key);
    const t = type === undefined ? 1 : toNum(type);
    if (t === 0) {
      const i = list.findIndex((v) => v !== null && typeRank(v) === typeRank(k) && compare(v, k) === 0);
      if (i < 0) throw E("#N/A");
      return i + 1;
    }
    let best = -1;
    list.forEach((v, i) => {
      if (v === null || typeRank(v) !== typeRank(k)) return;
      const c = compare(v, k);
      if (t > 0 ? c <= 0 : c >= 0) best = i;
    });
    if (best < 0) throw E("#N/A");
    return best + 1;
  },

  // Date
  TODAY: () => dateToSerial(new Date()),
  NOW: () => {
    const d = new Date();
    return dateToSerial(d) + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
  },
  DATE: ([y, m, d]) => dateToSerial(new Date(toNum(y), toNum(m) - 1, toNum(d))),
  YEAR: ([v]) => serialToDate(toNum(v)).getUTCFullYear(),
  MONTH: ([v]) => serialToDate(toNum(v)).getUTCMonth() + 1,
  DAY: ([v]) => serialToDate(toNum(v)).getUTCDate(),
};

export const FUNCTION_NAMES = [...Object.keys(LAZY), ...Object.keys(FN)].sort();

// ─── Evaluator ───────────────────────────────────────────────────────
/** @param {Array<{id:any,name:string,cells:Object<string,string>}>} sheets */
export function createEvaluator(sheets) {
  const byId = new Map(sheets.map((s) => [s.id, s]));
  const byName = new Map(sheets.map((s) => [s.name.toLowerCase(), s]));
  const cache = new Map();
  const visiting = new Set();

  function cellValue(sheet, row, col) {
    if (row < 0 || col < 0) throw E("#REF!");
    const key = `${sheet.id}|${row},${col}`;
    if (cache.has(key)) return cache.get(key);
    const raw = sheet.cells[`${row},${col}`];
    let result;
    if (typeof raw === "string" && raw[0] === "=" && raw.length > 1) {
      if (visiting.has(key)) return E("#CIRC!");
      visiting.add(key);
      try {
        result = sc(evalNode(parseFormula(raw.slice(1)), sheet));
        if (result === undefined) result = null;
      } catch (e) {
        if (e instanceof XlError) result = e;
        else throw e;
      } finally {
        visiting.delete(key);
      }
    } else result = parseLiteral(raw);
    cache.set(key, result);
    return result;
  }

  function resolveSheet(name, current) {
    if (!name) return current;
    const s = byName.get(name.toLowerCase());
    if (!s) throw E("#REF!");
    return s;
  }

  function evalNode(node, sheet) {
    switch (node.t) {
      case "lit":
        return node.v;
      case "empty":
        return undefined;
      case "ref":
        return [[cellValue(resolveSheet(node.sheet, sheet), node.row, node.col)]];
      case "range": {
        const s = resolveSheet(node.sheet, sheet);
        const rows = [];
        for (let r = node.r1; r <= node.r2; r++) {
          const row = [];
          for (let c = node.c1; c <= node.c2; c++) row.push(cellValue(s, r, c));
          rows.push(row);
        }
        return rows;
      }
      case "un": {
        const v = toNum(evalNode(node.e, sheet));
        return node.op === "-" ? -v : v;
      }
      case "pct":
        return toNum(evalNode(node.e, sheet)) / 100;
      case "bin": {
        const l = evalNode(node.l, sheet);
        const r = evalNode(node.r, sheet);
        switch (node.op) {
          case "+": return toNum(l) + toNum(r);
          case "-": return toNum(l) - toNum(r);
          case "*": return toNum(l) * toNum(r);
          case "/": {
            const d = toNum(r);
            if (d === 0) throw E("#DIV/0!");
            return toNum(l) / d;
          }
          case "^": return toNum(l) ** toNum(r);
          case "&": return toStr(l) + toStr(r);
          case "=": return compare(l, r) === 0;
          case "<>": return compare(l, r) !== 0;
          case "<": return compare(l, r) < 0;
          case ">": return compare(l, r) > 0;
          case "<=": return compare(l, r) <= 0;
          case ">=": return compare(l, r) >= 0;
          default: throw E("#VALUE!");
        }
      }
      case "call": {
        if (LAZY[node.name]) return LAZY[node.name](node.args, (n) => evalNode(n, sheet));
        const fn = FN[node.name];
        if (!fn) throw E("#NAME?");
        const out = fn(node.args.map((n) => evalNode(n, sheet)));
        if (typeof out === "number" && !Number.isFinite(out)) throw E("#NUM!");
        return out;
      }
      default:
        throw E("#VALUE!");
    }
  }

  return {
    value(sheetId, row, col) {
      const s = byId.get(sheetId);
      if (!s) return null;
      try {
        return cellValue(s, row, col);
      } catch (e) {
        if (e instanceof XlError) return e;
        throw e;
      }
    },
    /** Evaluate an ad-hoc formula (with or without "=") in the context of a sheet. */
    evalFormula(sheetId, formula) {
      const s = byId.get(sheetId);
      const src = formula[0] === "=" ? formula.slice(1) : formula;
      try {
        return sc(evalNode(parseFormula(src), s)) ?? null;
      } catch (e) {
        if (e instanceof XlError) return e;
        throw e;
      }
    },
  };
}

/** Syntax check used before committing a formula. Returns an error code or null. */
export function validateFormula(formula) {
  try {
    parseFormula(formula.slice(1));
    return null;
  } catch (e) {
    return e instanceof XlError ? e.code : "#NAME?";
  }
}
