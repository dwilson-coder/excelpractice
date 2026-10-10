import { useMemo } from "react";
import { usedRange, key } from "../../lib/model";
import { formatValue } from "../../utils/format";
import { useSheet, useEvaluator } from "../../store";
import { cellCss } from "./Grid";

/** Print-only rendering of the used range (the on-screen grid is hidden by @media print). */
export default function PrintSheet() {
  const sheet = useSheet();
  const ev = useEvaluator();
  const used = useMemo(() => usedRange(sheet), [sheet]);
  if (!used) return <div className="xs-print"><p>This sheet is empty.</p></div>;
  const rows = [];
  for (let r = 0; r <= used.r2; r++) {
    if (sheet.hiddenRows[r]) continue;
    const cells = [];
    for (let c = 0; c <= used.c2; c++) {
      const st = sheet.styles[key(r, c)];
      const v = ev.value(sheet.id, r, c);
      cells.push(
        <td key={c} style={{ ...cellCss(st), textAlign: cellCss(st)?.textAlign || (typeof v === "number" ? "right" : "left") }}>
          {formatValue(v, st)}
        </td>
      );
    }
    rows.push(<tr key={r}>{cells}</tr>);
  }
  return (
    <div className="xs-print">
      <h1>{sheet.name}</h1>
      <table>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
