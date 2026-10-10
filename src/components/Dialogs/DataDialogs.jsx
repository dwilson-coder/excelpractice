import { useState, useMemo } from "react";
import { FUNCTION_NAMES, rangeToA1 } from "../../utils/formulaEngine";
import { NUMBER_FORMATS, formatValue } from "../../utils/format";
import { OP_LABELS } from "../../lib/rules";
import { useStore } from "../../store";
import Modal, { Field } from "./Modal";

const selText = () => rangeToA1(useStore.getState().range());
const OPS = Object.entries(OP_LABELS);

// ── Insert function ───────────────────────────────────────────────────
const DESC = {
  SUM: "Adds numbers. SUM(A1:A10)", AVERAGE: "Mean of numbers. AVERAGE(B2:B9)", IF: 'Test a condition. IF(A1>10,"High","Low")', IFS: "Several conditions. IFS(A1>90,\"A\",A1>80,\"B\",TRUE,\"C\")",
  COUNT: "Counts numbers.", COUNTA: "Counts non-empty cells.", COUNTIF: 'Counts matches. COUNTIF(A:A,">5")', SUMIF: 'Sums matches. SUMIF(A1:A9,"x",B1:B9)', AVERAGEIF: "Mean of matches.",
  MAX: "Largest value.", MIN: "Smallest value.", ROUND: "Round to digits. ROUND(A1,2)", VLOOKUP: "Look up in first column. VLOOKUP(key,A1:C9,2,FALSE)", XLOOKUP: "Modern lookup. XLOOKUP(key,A1:A9,B1:B9)",
  INDEX: "Value at row/col of a range.", MATCH: "Position of a value.", AND: "All true?", OR: "Any true?", NOT: "Invert TRUE/FALSE.", IFERROR: "Fallback on error. IFERROR(A1/B1,0)",
  CONCAT: "Join text.", LEFT: "First n characters.", RIGHT: "Last n characters.", MID: "Middle characters.", LEN: "Text length.", UPPER: "UPPERCASE.", LOWER: "lowercase.", PROPER: "Title Case.", TRIM: "Remove extra spaces.",
  TEXT: 'Format a value. TEXT(A1,"0.00")', TODAY: "Today's date.", NOW: "Current date/time.", DATE: "Build a date. DATE(2026,10,9)", MEDIAN: "Middle value.", PRODUCT: "Multiply numbers.", SUMPRODUCT: "Sum of products.",
};

export function FunctionsDialog() {
  const close = useStore((s) => s.closeDialog);
  const [q, setQ] = useState("");
  const list = useMemo(() => FUNCTION_NAMES.filter((f) => f.toLowerCase().includes(q.toLowerCase())), [q]);
  const insert = (f) => {
    const s = useStore.getState();
    close();
    setTimeout(() => s.startEdit(s.anchor.r, s.anchor.c, { initial: `=${f}(`, mode: "edit" }), 0);
  };
  return (
    <Modal title="Insert function" onClose={close} wide>
      <input className="xs-input" placeholder="Search functions…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search functions" />
      <ul className="xs-fnlist">
        {list.map((f) => (
          <li key={f}>
            <button onClick={() => insert(f)}>
              <b>{f}</b>
              <span>{DESC[f] || ""}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="muted">No function matches “{q}”.</li>}
      </ul>
    </Modal>
  );
}

// ── Find / replace ────────────────────────────────────────────────────
export function FindDialog({ replace: showReplace }) {
  const s = useStore();
  const [text, setText] = useState("");
  const [repl, setRepl] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [inFormulas, setInFormulas] = useState(false);
  const opts = { matchCase, inFormulas };
  const find = () => (s.findHits.length && s.findIndex >= 0 ? s.stepFind(1) : s.runFind(text, opts));
  return (
    <Modal title={showReplace ? "Find and replace" : "Find"} onClose={() => (s.clearFind(), s.closeDialog())}
      footer={<>
        <span className="muted">{s.findHits.length ? `${s.findIndex + 1} of ${s.findHits.length}` : text ? "No matches" : ""}</span>
        {showReplace && <button className="btn" onClick={() => s.replaceCurrent(text, repl, opts)} disabled={!s.findHits.length}>Replace</button>}
        {showReplace && <button className="btn" onClick={() => { const n = s.replaceAll(text, repl, opts); s.toast(n ? `Replaced ${n} cell${n > 1 ? "s" : ""}.` : "Nothing to replace."); }} disabled={!text}>Replace all</button>}
        <button className="btn" onClick={() => s.stepFind(-1)} disabled={!s.findHits.length}>Previous</button>
        <button className="btn primary" onClick={find} disabled={!text}>{s.findHits.length ? "Next" : "Find"}</button>
      </>}>
      <Field label="Find"><input className="xs-input" value={text} onChange={(e) => { setText(e.target.value); s.runFind(e.target.value, opts); }} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), find())} /></Field>
      {showReplace && <Field label="Replace with"><input className="xs-input" value={repl} onChange={(e) => setRepl(e.target.value)} /></Field>}
      <label className="xs-check"><input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} /> Match case</label>
      <label className="xs-check"><input type="checkbox" checked={inFormulas} onChange={(e) => setInFormulas(e.target.checked)} /> Search inside formulas</label>
    </Modal>
  );
}

// ── Row height / column width ─────────────────────────────────────────
export function SizeDialog({ kind }) {
  const s = useStore();
  const rng = s.range();
  const cur = kind === "col" ? s.sheet().colWidths[rng.c1] ?? 100 : s.sheet().rowHeights[rng.r1] ?? 24;
  const [v, setV] = useState(String(cur));
  const n = Number(v);
  const ok = Number.isFinite(n) && n >= (kind === "col" ? 24 : 16) && n <= 600;
  const apply = () => ok && (s.sizeSelection(kind === "col" ? { width: n } : { height: n }), s.closeDialog());
  return (
    <Modal title={kind === "col" ? "Column width" : "Row height"} onClose={s.closeDialog} footer={<><button className="btn" onClick={s.closeDialog}>Cancel</button><button className="btn primary" onClick={apply} disabled={!ok}>OK</button></>}>
      <Field label={`${kind === "col" ? "Width" : "Height"} (pixels)`} hint={`Applies to the ${kind === "col" ? "column(s)" : "row(s)"} in your selection. ${kind === "col" ? "24–600" : "16–600"}.`}>
        <input className="xs-input" type="number" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} />
      </Field>
    </Modal>
  );
}

// ── Number format ─────────────────────────────────────────────────────
export function NumberFormatDialog() {
  const s = useStore();
  const rng = s.range();
  const st = s.sheet().styles[`${rng.r1},${rng.c1}`] || {};
  const [nf, setNf] = useState(st.nf || "general");
  const [dec, setDec] = useState(st.dec ?? (["general", "text", "date"].includes(st.nf || "general") ? 0 : 2));
  const sample = formatValue(1234.5678, { nf, dec: nf === "general" ? undefined : dec });
  return (
    <Modal title="Format cells — number" onClose={s.closeDialog} footer={<><button className="btn" onClick={s.closeDialog}>Cancel</button><button className="btn primary" onClick={() => (s.setStyle({ nf: nf === "general" ? undefined : nf, dec: nf === "general" || nf === "text" || nf === "date" ? undefined : dec }), s.closeDialog())}>OK</button></>}>
      <Field label="Category"><select className="xs-input" value={nf} onChange={(e) => setNf(e.target.value)}>{NUMBER_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></Field>
      {!["general", "text", "date"].includes(nf) && <Field label="Decimal places"><input className="xs-input" type="number" min="0" max="10" value={dec} onChange={(e) => setDec(Math.max(0, Math.min(10, +e.target.value || 0)))} /></Field>}
      <p className="muted">Sample: <b>{nf === "date" ? "2026-10-09" : sample}</b></p>
    </Modal>
  );
}

// ── Data validation ───────────────────────────────────────────────────
export function ValidationDialog() {
  const s = useStore();
  const rules = s.sheet().validations;
  const [range, setRange] = useState(selText());
  const [type, setType] = useState("list");
  const [op, setOp] = useState("between");
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [list, setList] = useState("Yes, No");
  const [message, setMessage] = useState("");
  const two = op === "between" || op === "notBetween";
  const add = () => {
    s.addValidation(type === "list" ? { range, type, list, message } : { range, type, op, v1, v2, message });
    s.toast("Validation rule added.");
  };
  return (
    <Modal title="Data validation" onClose={s.closeDialog} wide footer={<><button className="btn" onClick={s.closeDialog}>Close</button><button className="btn primary" onClick={add} disabled={!range || (type === "list" ? !list.trim() : v1 === "" || (two && v2 === ""))}>Add rule</button></>}>
      <Field label="Apply to range"><input className="xs-input" value={range} onChange={(e) => setRange(e.target.value.toUpperCase())} /></Field>
      <Field label="Allow">
        <select className="xs-input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="list">List (dropdown)</option><option value="whole">Whole number</option><option value="decimal">Decimal number</option><option value="textLength">Text length</option>
        </select>
      </Field>
      {type === "list" ? (
        <Field label="Allowed values" hint="Comma-separated. A dropdown arrow appears in each cell."><input className="xs-input" value={list} onChange={(e) => setList(e.target.value)} /></Field>
      ) : (
        <div className="xs-row">
          <Field label="Condition"><select className="xs-input" value={op} onChange={(e) => setOp(e.target.value)}>{OPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label={two ? "Minimum" : "Value"}><input className="xs-input" type="number" value={v1} onChange={(e) => setV1(e.target.value)} /></Field>
          {two && <Field label="Maximum"><input className="xs-input" type="number" value={v2} onChange={(e) => setV2(e.target.value)} /></Field>}
        </div>
      )}
      <Field label="Error message (optional)"><input className="xs-input" value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      <h3 className="xs-h3">Rules on this sheet</h3>
      {rules.length ? <ul className="xs-rules">{rules.map((r) => <li key={r.id}><span><b>{r.range}</b> · {r.type === "list" ? `list: ${r.list}` : `${r.type} ${OP_LABELS[r.op]} ${r.v1}${r.v2 !== "" && r.v2 != null && (r.op === "between" || r.op === "notBetween") ? " and " + r.v2 : ""}`}</span><button className="btn sm" onClick={() => s.removeValidation(r.id)}>Remove</button></li>)}</ul> : <p className="muted">None yet.</p>}
    </Modal>
  );
}

// ── Conditional formatting ────────────────────────────────────────────
const PRESETS = [
  { name: "Red", style: { bg: "#f4c7c3", color: "#9c0006" } },
  { name: "Yellow", style: { bg: "#fff2cc", color: "#7f6000" } },
  { name: "Green", style: { bg: "#b7e1cd", color: "#0b5d2a" } },
  { name: "Bold blue", style: { b: true, color: "#1a56c4" } },
];

export function CfDialog() {
  const s = useStore();
  const rules = s.sheet().cf;
  const [range, setRange] = useState(selText());
  const [type, setType] = useState("cellIs");
  const [op, setOp] = useState("gt");
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [preset, setPreset] = useState(0);
  const two = op === "between" || op === "notBetween";
  const needsValue = type === "cellIs" || type === "text";
  const add = () => {
    const base = { range, type };
    if (type === "scale") s.addCf({ ...base, colors: ["#ffffff", "#63be7b"] });
    else s.addCf({ ...base, op, v1, v2, style: PRESETS[preset].style });
    s.toast("Conditional formatting rule added.");
  };
  const label = (r) => (r.type === "scale" ? "color scale" : r.type === "duplicates" ? "duplicate values" : r.type === "text" ? `text contains “${r.v1}”` : `cell ${OP_LABELS[r.op]} ${r.v1}${r.v2 ? " and " + r.v2 : ""}`);
  return (
    <Modal title="Conditional formatting" onClose={s.closeDialog} wide footer={<><button className="btn" onClick={s.closeDialog}>Close</button><button className="btn primary" onClick={add} disabled={!range || (needsValue && v1 === "")}>Add rule</button></>}>
      <Field label="Apply to range"><input className="xs-input" value={range} onChange={(e) => setRange(e.target.value.toUpperCase())} /></Field>
      <Field label="Rule">
        <select className="xs-input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="cellIs">Cell value…</option><option value="text">Text contains…</option><option value="duplicates">Duplicate values</option><option value="scale">Color scale (white → green)</option>
        </select>
      </Field>
      {type === "cellIs" && (
        <div className="xs-row">
          <Field label="Condition"><select className="xs-input" value={op} onChange={(e) => setOp(e.target.value)}>{OPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label={two ? "From" : "Value"}><input className="xs-input" value={v1} onChange={(e) => setV1(e.target.value)} /></Field>
          {two && <Field label="To"><input className="xs-input" value={v2} onChange={(e) => setV2(e.target.value)} /></Field>}
        </div>
      )}
      {type === "text" && <Field label="Text"><input className="xs-input" value={v1} onChange={(e) => setV1(e.target.value)} /></Field>}
      {type !== "scale" && (
        <div className="xs-presets" role="radiogroup" aria-label="Format">
          {PRESETS.map((p, i) => (
            <button key={p.name} role="radio" aria-checked={preset === i} className={preset === i ? "on" : ""} style={{ background: p.style.bg, color: p.style.color, fontWeight: p.style.b ? 700 : 400 }} onClick={() => setPreset(i)}>{p.name}</button>
          ))}
        </div>
      )}
      <h3 className="xs-h3">Rules on this sheet</h3>
      {rules.length ? <ul className="xs-rules">{rules.map((r) => <li key={r.id}><span><b>{r.range}</b> · {label(r)}</span><button className="btn sm" onClick={() => s.removeCf(r.id)}>Remove</button></li>)}</ul> : <p className="muted">None yet.</p>}
    </Modal>
  );
}

// ── Chart ─────────────────────────────────────────────────────────────
export function ChartDialog({ id, type: initialType }) {
  const s = useStore();
  const existing = id ? s.sheet().charts.find((c) => c.id === id) : null;
  const [range, setRange] = useState(existing?.range || selText());
  const [type, setType] = useState(existing?.type || initialType || "bar");
  const [title, setTitle] = useState(existing?.title || "");
  const [headers, setHeaders] = useState(existing?.headers ?? true);
  const save = () => {
    if (existing) s.updateChart(existing.id, { range, type, title, headers });
    else s.addChart({ range, type, title, headers });
    s.closeDialog();
  };
  return (
    <Modal title={existing ? "Edit chart" : "Insert chart"} onClose={s.closeDialog} footer={<><button className="btn" onClick={s.closeDialog}>Cancel</button><button className="btn primary" onClick={save} disabled={!range}>{existing ? "Update" : "Insert"}</button></>}>
      <Field label="Data range" hint="First column = labels, other columns = series. The selection is used by default."><input className="xs-input" value={range} onChange={(e) => setRange(e.target.value.toUpperCase())} /></Field>
      <Field label="Chart type"><select className="xs-input" value={type} onChange={(e) => setType(e.target.value)}><option value="bar">Column / bar</option><option value="line">Line</option><option value="area">Area</option><option value="pie">Pie</option></select></Field>
      <Field label="Title"><input className="xs-input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <label className="xs-check"><input type="checkbox" checked={headers} onChange={(e) => setHeaders(e.target.checked)} /> First row contains series names</label>
    </Modal>
  );
}
