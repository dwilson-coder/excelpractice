import { useState, useRef, useEffect } from "react";
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, WrapText, Undo2, Redo2, Copy, Scissors, ClipboardPaste, Sigma, Printer, Percent, PaintBucket, Baseline, Search, ArrowDownAZ, ArrowUpAZ, Table2, Eraser } from "lucide-react";
import { FONT_FAMILIES, FONT_SIZES, DEFAULT_FONT, DEFAULT_FONT_SIZE } from "../../utils/constants";
import { NUMBER_FORMATS } from "../../utils/format";
import { allHave } from "../../lib/ops";
import { COLOR_SWATCHES } from "../../lib/menuDefs";
import { copySelection, pasteFromClipboard, autoSum, printSheet, focusGrid } from "../../lib/actions";
import { useStore } from "../../store";

const stop = (e) => e.preventDefault();

function Btn({ icon: Icon, label, onClick, active, disabled, children }) {
  return (
    <button className={`xs-tb-btn${active ? " on" : ""}`} title={label} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={stop} onClick={onClick}>
      {Icon ? <Icon size={15} /> : children}
    </button>
  );
}

function ColorBtn({ icon: Icon, label, value, onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => !ref.current?.contains(e.target) && setOpen(false);
    window.addEventListener("mousedown", away);
    return () => window.removeEventListener("mousedown", away);
  }, [open]);
  return (
    <span className="xs-tb-color" ref={ref}>
      <button className="xs-tb-btn" title={label} aria-label={label} onMouseDown={stop} onClick={() => setOpen((o) => !o)}>
        <Icon size={15} />
        <i style={{ background: value || (label.startsWith("Text") ? "#000" : "transparent") }} />
      </button>
      {open && (
        <div className="xs-menu xs-swatches xs-tb-pop" onMouseDown={stop}>
          {COLOR_SWATCHES.map((c) => <button key={c} className="xs-swatch" style={{ background: c }} aria-label={c} onClick={() => (onPick(c), setOpen(false))} />)}
          <button className="xs-swatch-none" onClick={() => (onPick(null), setOpen(false))}>Automatic / none</button>
          <label className="xs-swatch-custom">Custom…<input type="color" onChange={(e) => onPick(e.target.value)} /></label>
        </div>
      )}
    </span>
  );
}

export default function Toolbar() {
  const s = useStore();
  const sh = s.sheet();
  const rng = s.range();
  const cur = sh.styles[`${rng.r1},${rng.c1}`] || {};
  const on = (p) => allHave(sh, rng, p);

  return (
    <div className="xs-toolbar" role="toolbar" aria-label="Formatting" data-print-hide>
      <Btn icon={Undo2} label="Undo (Ctrl+Z)" onClick={s.undo} disabled={!s.past.length} />
      <Btn icon={Redo2} label="Redo (Ctrl+Y)" onClick={s.redo} disabled={!s.future.length} />
      <Btn icon={Printer} label="Print (Ctrl+P)" onClick={printSheet} />
      <span className="xs-tb-sep" />
      <Btn icon={Scissors} label="Cut (Ctrl+X)" onClick={() => copySelection(true)} />
      <Btn icon={Copy} label="Copy (Ctrl+C)" onClick={() => copySelection(false)} />
      <Btn icon={ClipboardPaste} label="Paste (Ctrl+V)" onClick={pasteFromClipboard} />
      <span className="xs-tb-sep" />
      <select className="xs-tb-select xs-tb-font" value={cur.ff || DEFAULT_FONT} aria-label="Font family" onChange={(e) => (s.setStyle({ ff: e.target.value === DEFAULT_FONT ? undefined : e.target.value }), focusGrid())}>
        {FONT_FAMILIES.map((f) => <option key={f}>{f}</option>)}
      </select>
      <select className="xs-tb-select xs-tb-size" value={cur.fs || DEFAULT_FONT_SIZE} aria-label="Font size" onChange={(e) => (s.setStyle({ fs: +e.target.value === DEFAULT_FONT_SIZE ? undefined : +e.target.value }), focusGrid())}>
        {FONT_SIZES.map((n) => <option key={n}>{n}</option>)}
      </select>
      <Btn icon={Bold} label="Bold (Ctrl+B)" active={on("b")} onClick={() => s.toggleStyle("b")} />
      <Btn icon={Italic} label="Italic (Ctrl+I)" active={on("i")} onClick={() => s.toggleStyle("i")} />
      <Btn icon={Underline} label="Underline (Ctrl+U)" active={on("u")} onClick={() => s.toggleStyle("u")} />
      <Btn icon={Strikethrough} label="Strikethrough" active={on("s")} onClick={() => s.toggleStyle("s")} />
      <ColorBtn icon={Baseline} label="Text color" value={cur.color} onPick={(c) => s.setStyle({ color: c || undefined })} />
      <ColorBtn icon={PaintBucket} label="Fill color" value={cur.bg} onPick={(c) => s.setStyle({ bg: c || undefined })} />
      <span className="xs-tb-sep" />
      <Btn icon={AlignLeft} label="Align left" active={cur.ha === "left"} onClick={() => s.setStyle({ ha: cur.ha === "left" ? undefined : "left" })} />
      <Btn icon={AlignCenter} label="Align center" active={cur.ha === "center"} onClick={() => s.setStyle({ ha: cur.ha === "center" ? undefined : "center" })} />
      <Btn icon={AlignRight} label="Align right" active={cur.ha === "right"} onClick={() => s.setStyle({ ha: cur.ha === "right" ? undefined : "right" })} />
      <Btn icon={WrapText} label="Wrap text" active={on("wrap")} onClick={() => s.toggleStyle("wrap")} />
      <select className="xs-tb-select" value={cur.nf || "general"} aria-label="Number format" onChange={(e) => (s.setNumberFormat(e.target.value), focusGrid())}>
        {NUMBER_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
      <Btn label="Currency" onClick={() => s.setNumberFormat("currency")}>$</Btn>
      <Btn icon={Percent} label="Percent" onClick={() => s.setNumberFormat("percent")} />
      <Btn label="Decrease decimals" onClick={() => s.changeDecimals(-1)}>.0</Btn>
      <Btn label="Increase decimals" onClick={() => s.changeDecimals(1)}>.00</Btn>
      <span className="xs-tb-sep" />
      <Btn label="Borders: all" onClick={() => s.setBorders(cur.bd ? "none" : "all")} active={!!cur.bd}>
        <span className="xs-bdicon" />
      </Btn>
      <Btn icon={Sigma} label="AutoSum" onClick={() => autoSum("SUM")} />
      <Btn icon={ArrowDownAZ} label="Sort A → Z" onClick={() => s.sortSelection(true)} />
      <Btn icon={ArrowUpAZ} label="Sort Z → A" onClick={() => s.sortSelection(false)} />
      <Btn icon={Table2} label="Pivot table" onClick={s.openPivot} active={s.pivot.open} />
      <Btn icon={Search} label="Find & replace (Ctrl+F)" onClick={() => s.openDialog("find", { replace: false })} />
      <Btn icon={Eraser} label="Clear formatting" onClick={s.clearFormats} />
    </div>
  );
}
