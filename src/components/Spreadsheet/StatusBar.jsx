import { useMemo } from "react";
import { createEvaluator, isError, rangeToA1 } from "../../utils/formulaEngine";
import { useStore } from "../../store";

/** Count / Sum / Average of the selection (like Excel's status bar) plus save state. */
export default function StatusBar() {
  const sheets = useStore((s) => s.sheets);
  const activeSheetId = useStore((s) => s.activeSheetId);
  const anchor = useStore((s) => s.anchor);
  const focus = useStore((s) => s.focus);
  const dirty = useStore((s) => s.dirty);
  const saved = useStore((s) => s.autosaved);
  const encrypted = useStore((s) => !!s.password);
  const rng = { r1: Math.min(anchor.r, focus.r), r2: Math.max(anchor.r, focus.r), c1: Math.min(anchor.c, focus.c), c2: Math.max(anchor.c, focus.c) };
  const multi = rng.r1 !== rng.r2 || rng.c1 !== rng.c2;

  const stats = useMemo(() => {
    if (!multi) return null;
    const ev = createEvaluator(sheets);
    let n = 0;
    let count = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let r = rng.r1; r <= rng.r2; r++)
      for (let c = rng.c1; c <= rng.c2; c++) {
        const v = ev.value(activeSheetId, r, c);
        if (v === null || isError(v)) continue;
        count++;
        if (typeof v === "number") (n++, (sum += v), (min = Math.min(min, v)), (max = Math.max(max, v)));
      }
    return { count, n, sum, avg: n ? sum / n : 0, min, max };
  }, [sheets, activeSheetId, rng.r1, rng.r2, rng.c1, rng.c2, multi]);

  const f = (v) => Number(v.toPrecision(10)).toLocaleString("en-US", { maximumFractionDigits: 6 });

  return (
    <div className="xs-status" data-print-hide>
      <span className="xs-status-left">
        {encrypted ? "🔒 Encrypted autosave" : saved === "plain" ? "Autosaved in this browser" : saved === "off" ? "Autosave off (cookie settings)" : dirty ? "Unsaved changes" : "Ready"}
      </span>
      <span className="xs-status-right">
        {stats && (
          <>
            <span>{rangeToA1(rng)}</span>
            <span>Count: {stats.count}</span>
            {stats.n > 0 && (
              <>
                <span>Sum: {f(stats.sum)}</span>
                <span>Average: {f(stats.avg)}</span>
                <span>Min: {f(stats.min)}</span>
                <span>Max: {f(stats.max)}</span>
              </>
            )}
          </>
        )}
      </span>
    </div>
  );
}
