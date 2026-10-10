import { memo, useMemo, useRef, useEffect, useLayoutEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ROWS, COLS, DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT, HEADER_WIDTH, HEADER_HEIGHT } from "../../utils/constants";
import { colToLetters } from "../../utils/formulaEngine";
import { formatValue } from "../../utils/format";
import { key } from "../../lib/model";
import { computeConditionalStyles, listFor } from "../../lib/rules";
import { copySelection, pasteText, saveXlsx, openFilePicker, printSheet } from "../../lib/actions";
import { useStore, useSheet, useEvaluator } from "../../store";
import ChartLayer from "../Chart/ChartLayer";

const PALETTE_REF = ["#2f6fdc", "#e8710a", "#9334e6", "#d93025"];

export function cellCss(st) {
  if (!st) return undefined;
  const css = {};
  if (st.b) css.fontWeight = 700;
  if (st.i) css.fontStyle = "italic";
  if (st.u || st.s) css.textDecoration = [st.u && "underline", st.s && "line-through"].filter(Boolean).join(" ");
  if (st.ff) css.fontFamily = `"${st.ff}", sans-serif`;
  if (st.fs) css.fontSize = Math.round(st.fs * 13.33) / 10; // pt → px
  if (st.color) css.color = st.color;
  if (st.bg) css.background = st.bg;
  if (st.ha) css.textAlign = st.ha;
  if (st.wrap) {
    css.whiteSpace = "normal";
    css.lineHeight = 1.2;
    css.alignItems = "flex-start";
  }
  if (st.bd) {
    const line = "1px solid #111827";
    if (st.bd.t) css.borderTop = line;
    if (st.bd.r) css.borderRight = line;
    if (st.bd.b) css.borderBottom = line;
    if (st.bd.l) css.borderLeft = line;
  }
  return css;
}

const sameShallow = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
};

const Cell = memo(
  function Cell({ r, c, text, kind, st, cf, hidden }) {
    const style = useMemo(() => cellCss(cf ? { ...st, ...cf } : st), [st, cf]);
    const align = style?.textAlign || (kind === "num" ? "right" : kind === "center" ? "center" : "left");
    return (
      <div className={`xs-cell${hidden ? " xs-hidden" : ""}`} data-r={r} data-c={c} style={{ ...style, justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start", textAlign: align }}>
        <span>{text}</span>
      </div>
    );
  },
  (a, b) => a.text === b.text && a.kind === b.kind && a.st === b.st && a.hidden === b.hidden && a.r === b.r && sameShallow(a.cf, b.cf)
);

function useGeometry(sheet) {
  return useMemo(() => {
    const colW = Array.from({ length: COLS }, (_, c) => sheet.colWidths[c] ?? DEFAULT_COL_WIDTH);
    const rowH = Array.from({ length: ROWS }, (_, r) => (sheet.hiddenRows[r] ? 0 : sheet.rowHeights[r] ?? DEFAULT_ROW_HEIGHT));
    const colX = [];
    const rowY = [];
    let x = 0;
    colW.forEach((w) => (colX.push(x), (x += w)));
    let y = 0;
    rowH.forEach((h) => (rowY.push(y), (y += h)));
    return { colW, rowH, colX, rowY, width: HEADER_WIDTH + x, height: HEADER_HEIGHT + y };
  }, [sheet.colWidths, sheet.rowHeights, sheet.hiddenRows]);
}

const rectOf = (g, rng) => ({
  left: HEADER_WIDTH + g.colX[rng.c1],
  top: HEADER_HEIGHT + g.rowY[rng.r1],
  width: g.colX[rng.c2] + g.colW[rng.c2] - g.colX[rng.c1],
  height: g.rowY[rng.r2] + g.rowH[rng.r2] - g.rowY[rng.r1],
});

export default function Grid() {
  const sheet = useSheet();
  const ev = useEvaluator();
  const geo = useGeometry(sheet);
  const scroller = useRef(null);
  const dragRef = useRef(null);

  const anchor = useStore((s) => s.anchor);
  const focus = useStore((s) => s.focus);
  const editing = useStore((s) => s.editing);
  const clipboard = useStore((s) => s.clipboard);
  const findHits = useStore((s) => s.findHits);
  const view = useStore((s) => s.view);
  const [picker, setPicker] = useState(false);

  const rng = useMemo(() => ({ r1: Math.min(anchor.r, focus.r), r2: Math.max(anchor.r, focus.r), c1: Math.min(anchor.c, focus.c), c2: Math.max(anchor.c, focus.c) }), [anchor, focus]);

  // Display values (recomputed only when data changes — not when the selection moves)
  const cf = useMemo(() => (sheet.cf.length ? computeConditionalStyles(sheet, (r, c) => ev.value(sheet.id, r, c)) : {}), [sheet, ev]);
  const cells = useMemo(() => {
    const out = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const k = key(r, c);
        const st = sheet.styles[k];
        const raw = sheet.cells[k];
        let text = "";
        let kind = "text";
        if (raw !== undefined) {
          const v = ev.value(sheet.id, r, c);
          text = formatValue(v, st);
          kind = typeof v === "number" ? "num" : typeof v === "boolean" || (typeof text === "string" && text[0] === "#" && typeof v === "object") ? "center" : "text";
        }
        out.push({ r, c, k, text, kind, st, hidden: !!sheet.hiddenRows[r] });
      }
    return out;
  }, [sheet, ev]);

  // Keep the focused cell visible (and sticky headers in mind)
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const x = HEADER_WIDTH + geo.colX[focus.c];
    const y = HEADER_HEIGHT + geo.rowY[focus.r];
    const w = geo.colW[focus.c];
    const h = geo.rowH[focus.r];
    if (x < el.scrollLeft + HEADER_WIDTH) el.scrollLeft = x - HEADER_WIDTH;
    else if (x + w > el.scrollLeft + el.clientWidth) el.scrollLeft = x + w - el.clientWidth;
    if (y < el.scrollTop + HEADER_HEIGHT) el.scrollTop = y - HEADER_HEIGHT;
    else if (y + h > el.scrollTop + el.clientHeight) el.scrollTop = y + h - el.clientHeight;
  }, [focus.r, focus.c]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPicker(false), [anchor.r, anchor.c, sheet.id]);

  // ── Mouse: selection, formula pointing, resizing ─────────────────
  const cellAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest("[data-r],[data-ch],[data-rh]");
    if (!el) return null;
    if (el.dataset.r !== undefined) return { r: +el.dataset.r, c: +el.dataset.c };
    if (el.dataset.ch !== undefined) return { c: +el.dataset.ch, col: true };
    return { r: +el.dataset.rh, row: true };
  };

  const startResize = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const s = useStore.getState();
    const kind = handle.dataset.resize;
    const i = +handle.dataset.i;
    const start = kind === "col" ? geo.colW[i] : geo.rowH[i];
    const from = kind === "col" ? e.clientX : e.clientY;
    const sel = s.range();
    const whole = kind === "col" ? sel.r1 === 0 && sel.r2 === ROWS - 1 && i >= sel.c1 && i <= sel.c2 : sel.c1 === 0 && sel.c2 === COLS - 1 && i >= sel.r1 && i <= sel.r2;
    const targets = whole ? Array.from({ length: kind === "col" ? sel.c2 - sel.c1 + 1 : sel.r2 - sel.r1 + 1 }, (_, n) => (kind === "col" ? sel.c1 : sel.r1) + n) : [i];
    s.beginTransient();
    const move = (ev2) => {
      const size = start + (kind === "col" ? ev2.clientX : ev2.clientY) - from;
      targets.forEach((t) => (kind === "col" ? s.setColWidth(t, size) : s.setRowHeight(t, size)));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      s.endTransient();
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest("input,.xs-picker")) return;
    const handle = e.target.closest("[data-resize]");
    if (handle) return startResize(e, handle);
    const hit = cellAt(e.clientX, e.clientY);
    const corner = e.target.closest("[data-corner]");
    if (!hit && !corner) return;
    const s = useStore.getState();
    const pointing = s.editing && s.canPoint() && hit && !hit.col && !hit.row;
    if (!pointing) {
      if (s.editing && s.commitEdit()) {
        e.preventDefault();
        return; // validation failed: stay in edit mode
      }
      scroller.current?.focus({ preventScroll: true });
    }
    e.preventDefault();
    if (corner) return s.selectAll();
    if (pointing) {
      s.pointRef(hit, hit);
      dragRef.current = { type: "point", start: hit };
    } else if (hit.col) {
      s.selectCol(hit.c, e.shiftKey);
      dragRef.current = { type: "col" };
    } else if (hit.row) {
      s.selectRow(hit.r, e.shiftKey);
      dragRef.current = { type: "row" };
    } else {
      s.select(hit.r, hit.c, { extend: e.shiftKey });
      dragRef.current = { type: "cell" };
    }
    const move = (ev2) => {
      const d = dragRef.current;
      if (!d) return;
      const el = scroller.current;
      const box = el.getBoundingClientRect();
      if (ev2.clientX > box.right - 24) el.scrollLeft += 24;
      else if (ev2.clientX < box.left + HEADER_WIDTH + 12) el.scrollLeft -= 24;
      if (ev2.clientY > box.bottom - 24) el.scrollTop += 24;
      else if (ev2.clientY < box.top + HEADER_HEIGHT + 12) el.scrollTop -= 24;
      const cur = cellAt(ev2.clientX, ev2.clientY);
      if (!cur) return;
      const st2 = useStore.getState();
      if (d.type === "point" && cur.r !== undefined && !cur.col && !cur.row) st2.pointRef(d.start, cur);
      else if (d.type === "cell" && !cur.col && !cur.row) st2.select(cur.r, cur.c, { extend: true });
      else if (d.type === "col" && cur.c !== undefined) useStore.setState((x) => ({ focus: { r: ROWS - 1, c: cur.c }, anchor: x.anchor }));
      else if (d.type === "row" && cur.r !== undefined) useStore.setState((x) => ({ focus: { r: cur.r, c: COLS - 1 }, anchor: x.anchor }));
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onDoubleClick = (e) => {
    const handle = e.target.closest("[data-resize]");
    const s = useStore.getState();
    if (handle) {
      if (handle.dataset.resize === "col") s.autoFitColumn(+handle.dataset.i);
      else s.mutate((sh) => ({ ...sh, rowHeights: Object.fromEntries(Object.entries(sh.rowHeights).filter(([k]) => +k !== +handle.dataset.i)) }));
      return;
    }
    const el = e.target.closest("[data-r]");
    if (el && !e.target.closest("input")) s.startEdit(+el.dataset.r, +el.dataset.c, { mode: "edit" });
  };

  const onContextMenu = (e) => {
    const el = e.target.closest("[data-r],[data-ch],[data-rh]");
    if (!el) return;
    e.preventDefault();
    const s = useStore.getState();
    if (el.dataset.r !== undefined) {
      const r = +el.dataset.r;
      const c = +el.dataset.c;
      const sel = s.range();
      if (!(r >= sel.r1 && r <= sel.r2 && c >= sel.c1 && c <= sel.c2)) s.select(r, c);
    } else if (el.dataset.ch !== undefined) {
      const c = +el.dataset.ch;
      const sel = s.range();
      if (!(sel.r1 === 0 && sel.r2 === ROWS - 1 && c >= sel.c1 && c <= sel.c2)) s.selectCol(c);
    } else {
      const r = +el.dataset.rh;
      const sel = s.range();
      if (!(sel.c1 === 0 && sel.c2 === COLS - 1 && r >= sel.r1 && r <= sel.r2)) s.selectRow(r);
    }
    window.dispatchEvent(new CustomEvent("xs-context-menu", { detail: { x: e.clientX, y: e.clientY, kind: el.dataset.r !== undefined ? "cell" : el.dataset.ch !== undefined ? "col" : "row" } }));
  };

  // ── Keyboard ─────────────────────────────────────────────────────
  const onKeyDown = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    const s = useStore.getState();
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    const lower = k.toLowerCase();
    const extend = e.shiftKey;

    if (mod) {
      const handled = (fn) => (e.preventDefault(), fn(), true);
      if (lower === "z" && !extend) return handled(s.undo);
      if (lower === "y" || (lower === "z" && extend)) return handled(s.redo);
      if (lower === "a") return handled(s.selectAll);
      if (lower === "b") return handled(() => s.toggleStyle("b"));
      if (lower === "i") return handled(() => s.toggleStyle("i"));
      if (lower === "u") return handled(() => s.toggleStyle("u"));
      if (lower === "d") return handled(() => s.fill("down"));
      if (lower === "r") return handled(() => s.fill("right"));
      if (lower === "f") return handled(() => s.openDialog("find", { replace: false }));
      if (lower === "h") return handled(() => s.openDialog("find", { replace: true }));
      if (lower === "s") return handled(saveXlsx);
      if (lower === "o") return handled(openFilePicker);
      if (lower === "p") return handled(printSheet);
      if (k === "1") return handled(() => s.openDialog("numberFormat"));
      if (k === "Home") return handled(() => s.select(0, 0, { extend }));
      if (k === " ") return handled(() => s.selectCol(s.focus.c));
      if (["c", "x", "v"].includes(lower)) return; // handled by native clipboard events
    }
    if (e.altKey) return;

    const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[k]) {
      e.preventDefault();
      return s.moveActive(...arrows[k], { extend, jump: mod });
    }
    switch (k) {
      case "Tab":
        e.preventDefault();
        return s.moveActive(0, extend ? -1 : 1);
      case "Enter":
        e.preventDefault();
        return s.moveActive(extend ? -1 : 1, 0);
      case "Home":
        e.preventDefault();
        return s.select(s.anchor.r, 0, { extend });
      case "PageDown":
        e.preventDefault();
        return s.moveActive(20, 0, { extend });
      case "PageUp":
        e.preventDefault();
        return s.moveActive(-20, 0, { extend });
      case "Delete":
      case "Backspace":
        e.preventDefault();
        return s.clearContents();
      case "Escape":
        s.setClipboard(null);
        return;
      case "F2":
        e.preventDefault();
        return s.startEdit(s.anchor.r, s.anchor.c, { mode: "edit" });
      case "ContextMenu":
        e.preventDefault();
        return;
      default:
        // Typing starts editing immediately — no double-click needed.
        if (k.length === 1 && !mod) {
          e.preventDefault();
          s.startEdit(s.anchor.r, s.anchor.c, { initial: k, mode: "enter" });
        }
    }
  };

  const items = useMemo(() => {
    const hdr = [];
    for (let c = 0; c < COLS; c++) hdr.push(c);
    return hdr;
  }, []);

  const selRect = rectOf(geo, rng);
  const activeRect = rectOf(geo, { r1: anchor.r, c1: anchor.c, r2: anchor.r, c2: anchor.c });
  const clipRect = clipboard && clipboard.sheetId === sheet.id ? rectOf(geo, clipboard.rng) : null;
  const dropdown = !editing && listFor(sheet, anchor.r, anchor.c);

  return (
    <div
      ref={scroller}
      className="xs-scroll"
      tabIndex={0}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      onCopy={(e) => !editing && copySelection(false, e)}
      onCut={(e) => !editing && copySelection(true, e)}
      onPaste={(e) => {
        if (editing) return;
        e.preventDefault();
        pasteText(e.clipboardData.getData("text/plain"));
      }}
      role="grid"
      aria-label="Spreadsheet"
      aria-rowcount={ROWS}
      aria-colcount={COLS}
    >
      <div
        className={`xs-grid${view.gridlines ? "" : " xs-nolines"}${view.headings ? "" : " xs-noheads"}`}
        style={{
          width: geo.width,
          height: geo.height,
          gridTemplateColumns: `${HEADER_WIDTH}px ${geo.colW.map((w) => w + "px").join(" ")}`,
          gridTemplateRows: `${HEADER_HEIGHT}px ${geo.rowH.map((h) => h + "px").join(" ")}`,
        }}
      >
        <div className="xs-corner" data-corner title="Select all" />
        {items.map((c) => (
          <div key={c} className={`xs-ch${c >= rng.c1 && c <= rng.c2 ? " sel" : ""}${rng.r1 === 0 && rng.r2 === ROWS - 1 && c >= rng.c1 && c <= rng.c2 ? " full" : ""}`} data-ch={c}>
            {colToLetters(c)}
            <span className="xs-resize-col" data-resize="col" data-i={c} title="Drag to resize · double-click to auto-fit" />
          </div>
        ))}
        {Array.from({ length: ROWS }, (_, r) => {
          const rowCells = cells.slice(r * COLS, r * COLS + COLS);
          return [
            <div key={`h${r}`} className={`xs-rh${r >= rng.r1 && r <= rng.r2 ? " sel" : ""}${rng.c1 === 0 && rng.c2 === COLS - 1 && r >= rng.r1 && r <= rng.r2 ? " full" : ""}${sheet.hiddenRows[r] ? " xs-hidden" : ""}`} data-rh={r}>
              {r + 1}
              <span className="xs-resize-row" data-resize="row" data-i={r} title="Drag to resize" />
            </div>,
            ...rowCells.map((x) => <Cell key={x.k} r={x.r} c={x.c} text={x.text} kind={x.kind} st={x.st} cf={cf[x.k]} hidden={x.hidden} />),
          ];
        })}

        {/* Overlays */}
        {findHits.map((h) => <div key={`f${h.r},${h.c}`} className="xs-find" style={rectOf(geo, { r1: h.r, c1: h.c, r2: h.r, c2: h.c })} />)}
        <div className="xs-sel" style={selRect} />
        {clipRect && <div className={`xs-clip${clipboard.cut ? " cut" : ""}`} style={clipRect} />}
        {editing?.point?.rng && <div className="xs-point" style={{ ...rectOf(geo, editing.point.rng), borderColor: PALETTE_REF[0] }} />}
        <div className="xs-active" style={activeRect} />
        <ChartLayer sheet={sheet} />

        {dropdown && (
          <>
            <button className="xs-dd" style={{ left: activeRect.left + activeRect.width - 18, top: activeRect.top + activeRect.height / 2 - 8 }} onMouseDown={(e) => (e.preventDefault(), e.stopPropagation(), setPicker((p) => !p))} aria-label="Show allowed values">
              <ChevronDown size={11} />
            </button>
            {picker && (
              <div className="xs-picker" style={{ left: activeRect.left, top: activeRect.top + activeRect.height }}>
                {dropdown.map((opt) => (
                  <button key={opt} onMouseDown={(e) => (e.preventDefault(), useStore.getState().writeCell(anchor.r, anchor.c, opt), setPicker(false))}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {editing && <CellEditor geo={geo} sheet={sheet} editing={editing} scroller={scroller} />}
      </div>
    </div>
  );
}

function CellEditor({ geo, sheet, editing, scroller }) {
  const ref = useRef(null);
  const { r, c, value, source } = editing;
  const st = sheet.styles[key(r, c)];
  const rect = rectOf(geo, { r1: r, c1: c, r2: r, c2: c });
  const setEditValue = useStore((s) => s.setEditValue);

  useLayoutEffect(() => {
    if (source === "cell" && ref.current && document.activeElement !== ref.current) {
      ref.current.focus({ preventScroll: true });
      const n = ref.current.value.length;
      ref.current.setSelectionRange(n, n);
    }
  }, [source]);

  // Re-sync the caret after a pointed reference is inserted
  useLayoutEffect(() => {
    if (source === "cell" && ref.current && editing.point && document.activeElement === ref.current) ref.current.setSelectionRange(editing.caret, editing.caret);
  }, [editing.point, editing.caret, source]);

  const onKeyDown = (e) => {
    const s = useStore.getState();
    e.stopPropagation();
    const k = e.key;
    if (k === "Enter" && !e.altKey) {
      e.preventDefault();
      if (!s.commitEdit({ dr: e.shiftKey ? -1 : 1 })) scroller.current?.focus({ preventScroll: true });
    } else if (k === "Tab") {
      e.preventDefault();
      if (!s.commitEdit({ dc: e.shiftKey ? -1 : 1 })) scroller.current?.focus({ preventScroll: true });
    } else if (k === "Escape") {
      e.preventDefault();
      s.cancelEdit();
      scroller.current?.focus({ preventScroll: true });
    } else if (k === "F2") {
      e.preventDefault();
      s.setEditMode(editing.mode === "enter" ? "edit" : "enter");
    } else if (editing.mode === "enter" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k) && !e.shiftKey && !(value[0] === "=" && s.canPoint())) {
      e.preventDefault();
      const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
      if (!s.commitEdit({ dr: d[0], dc: d[1] })) scroller.current?.focus({ preventScroll: true });
    }
  };

  return (
    <input
      ref={ref}
      className="xs-editor"
      value={value}
      spellCheck={false}
      autoComplete="off"
      aria-label="Cell editor"
      style={{
        left: rect.left,
        top: rect.top,
        minWidth: rect.width,
        width: Math.max(rect.width, value.length * ((st?.fs || 11) * 0.62) + 24),
        height: rect.height,
        fontFamily: st?.ff ? `"${st.ff}", sans-serif` : undefined,
        fontSize: st?.fs ? Math.round(st.fs * 13.33) / 10 : undefined,
        fontWeight: st?.b ? 700 : undefined,
        fontStyle: st?.i ? "italic" : undefined,
      }}
      onFocus={() => useStore.getState().setEditSource("cell")}
      onChange={(e) => setEditValue(e.target.value, e.target.selectionStart)}
      onSelect={(e) => useStore.getState().setEditCaret(e.target.selectionStart)}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (e.relatedTarget?.dataset?.keepEdit !== undefined) return;
        const s = useStore.getState();
        if (s.editing && s.editing.source === "cell") s.commitEdit();
      }}
    />
  );
}

