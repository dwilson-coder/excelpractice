import { useEffect, useState } from "react";
import { Sigma, CornerDownLeft } from "lucide-react";
import { toCellRef, parseRangeRef, rangeToA1, validateFormula } from "../../utils/formulaEngine";
import { ROWS, COLS } from "../../utils/constants";
import { key } from "../../lib/model";
import { focusGrid } from "../../lib/actions";
import { useStore, useSheet } from "../../store";

const nameOf = (rng) => (rng.r1 === rng.r2 && rng.c1 === rng.c2 ? toCellRef(rng.r1, rng.c1) : rangeToA1(rng));

/**
 * Name box · fx · formula input · "Output cell".
 * Type a formula (with or without "=") and set Output cell to run it and put the result there;
 * leave Output cell empty to edit the active cell in place.
 */
export default function FormulaBar() {
  const sheet = useSheet();
  const anchor = useStore((s) => s.anchor);
  const focus = useStore((s) => s.focus);
  const editing = useStore((s) => s.editing);
  const [nameText, setNameText] = useState("A1");
  const [target, setTarget] = useState("");
  const [draft, setDraft] = useState(null); // text typed while no cell edit is active
  const rng = { r1: Math.min(anchor.r, focus.r), r2: Math.max(anchor.r, focus.r), c1: Math.min(anchor.c, focus.c), c2: Math.max(anchor.c, focus.c) };

  useEffect(() => setNameText(nameOf(rng)), [rng.r1, rng.r2, rng.c1, rng.c2]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(null), [anchor.r, anchor.c, sheet.id]);

  const raw = String(sheet.cells[key(anchor.r, anchor.c)] ?? "");
  const shown = editing ? editing.value : draft ?? raw;
  const hasTarget = target.trim() !== "";
  const err = shown[0] === "=" || hasTarget ? validateFormula(shown[0] === "=" ? shown : "=" + shown) : null;

  const goTo = () => {
    const rngRef = parseRangeRef(nameText.trim().replace(/\$/g, ""));
    const s = useStore.getState();
    if (!rngRef || rngRef.r1 < 0 || rngRef.c1 < 0 || rngRef.r2 >= ROWS || rngRef.c2 >= COLS) {
      s.toast(`"${nameText}" isn't a valid reference (A1:Z${ROWS}).`, "error");
      return setNameText(nameOf(rng));
    }
    s.selectRange({ r: rngRef.r1, c: rngRef.c1 }, { r: rngRef.r2, c: rngRef.c2 });
    focusGrid();
  };

  const onChange = (e) => {
    const s = useStore.getState();
    if (s.editing) s.setEditValue(e.target.value, e.target.selectionStart);
    else if (hasTarget) setDraft(e.target.value);
    else {
      setDraft(null);
      s.startEdit(s.anchor.r, s.anchor.c, { initial: e.target.value, mode: "edit", source: "bar" });
    }
  };

  const run = () => {
    const s = useStore.getState();
    if (hasTarget) {
      if (s.writeToTarget(s.editing ? s.editing.value : shown, target)) {
        setDraft(null);
        setTarget("");
        s.cancelEdit();
        focusGrid();
      }
    } else if (s.editing) {
      if (!s.commitEdit({ dr: 1 })) focusGrid();
    }
  };

  const onKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      run();
    } else if (e.key === "Escape") {
      useStore.getState().cancelEdit();
      setDraft(null);
      focusGrid();
    }
  };

  return (
    <div className="xs-fbar" data-print-hide>
      <input className="xs-namebox" value={nameText} onChange={(e) => setNameText(e.target.value)} onKeyDown={(e) => (e.stopPropagation(), e.key === "Enter" && goTo())} onFocus={(e) => e.target.select()} aria-label="Name box" spellCheck={false} />
      <button className="xs-fx" title="Insert function" onMouseDown={(e) => e.preventDefault()} onClick={() => useStore.getState().openDialog("functions")} aria-label="Insert function">
        <Sigma size={14} />
      </button>
      <input
        className={`xs-fbar-input${err ? " bad" : ""}`}
        value={shown}
        data-keep-edit
        spellCheck={false}
        placeholder={hasTarget ? "Type a formula, e.g. SUM(A1:A10)" : "Enter a value or formula (=SUM(A1:A5), =IF(A1>10,\"High\",\"Low\"))"}
        onFocus={() => useStore.getState().setEditSource("bar")}
        onChange={onChange}
        onSelect={(e) => useStore.getState().editing && useStore.getState().setEditCaret(e.target.selectionStart)}
        onKeyDown={onKeyDown}
        aria-label="Formula bar"
      />
      <label className="xs-out" title="Optional. Type a cell (D5) or range (D5:D10) and press Enter in the formula bar to put the result there.">
        <span>Output cell</span>
        <input value={target} onChange={(e) => setTarget(e.target.value.toUpperCase())} onKeyDown={onKeyDown} placeholder="e.g. D5" spellCheck={false} data-keep-edit aria-label="Output cell" />
      </label>
      <button className="xs-run" onMouseDown={(e) => e.preventDefault()} onClick={run} title="Run (Enter)" aria-label="Run formula">
        <CornerDownLeft size={14} />
      </button>
      {err && <span className="xs-ferr" role="alert">{err}</span>}
    </div>
  );
}
