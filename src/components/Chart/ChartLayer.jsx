import { useMemo } from "react";
import { X } from "lucide-react";
import { HEADER_WIDTH, HEADER_HEIGHT } from "../../utils/constants";
import { isError } from "../../utils/formulaEngine";
import { rangeOf } from "../../lib/rules";
import { useStore } from "../../store/useStore";
import { useEvaluator } from "../../store";

export const PALETTE = ["#217346", "#2f6fdc", "#e8710a", "#9334e6", "#d93025", "#12a4af", "#f5b400", "#6b7280"];

/** Turn a cell range into { labels, series:[{name,values}] }. First column = labels; first row = series names when headers is on. */
export function chartData(chart, ev, sheetId) {
  const rng = rangeOf(chart.range);
  if (!rng) return { labels: [], series: [] };
  const val = (r, c) => {
    const v = ev.value(sheetId, r, c);
    return isError(v) ? null : v;
  };
  const textual = (c) => {
    for (let r = rng.r1 + (chart.headers ? 1 : 0); r <= rng.r2; r++) if (typeof val(r, c) === "string") return true;
    return false;
  };
  const hasLabels = rng.c2 > rng.c1 || textual(rng.c1);
  const firstSeries = hasLabels ? rng.c1 + 1 : rng.c1;
  const r0 = rng.r1 + (chart.headers ? 1 : 0);
  const labels = [];
  for (let r = r0; r <= rng.r2; r++) labels.push(hasLabels ? String(val(r, rng.c1) ?? "") : String(r - r0 + 1));
  const series = [];
  for (let c = firstSeries; c <= rng.c2; c++) {
    const values = [];
    for (let r = r0; r <= rng.r2; r++) {
      const v = val(r, c);
      values.push(typeof v === "number" ? v : Number(v) || 0);
    }
    series.push({ name: chart.headers ? String(val(rng.r1, c) ?? `Series ${series.length + 1}`) : `Series ${series.length + 1}`, values });
  }
  return { labels, series };
}

const nice = (max) => {
  if (max <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};
const fmt = (v) => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.abs(v) >= 1e4 ? (v / 1e3).toFixed(0) + "k" : String(Number(v.toPrecision(4))));

export function ChartSvg({ chart, data, width, height }) {
  const { labels, series } = data;
  const title = chart.title;
  const top = title ? 30 : 12;
  const legendH = series.length > 1 || chart.type === "pie" ? 22 : 0;
  const left = 46;
  const bottom = 26 + legendH;
  const pw = Math.max(10, width - left - 12);
  const ph = Math.max(10, height - top - bottom);
  if (!series.length || !labels.length) return <svg width={width} height={height}><text x={width / 2} y={height / 2} textAnchor="middle" fill="#9ca3af" fontSize="12">No data in range</text></svg>;

  const legend = (items) => (
    <g transform={`translate(${left}, ${height - 14})`}>
      {items.map((it, i) => (
        <g key={i} transform={`translate(${i * 90}, 0)`}>
          <rect width="10" height="10" y="-9" fill={PALETTE[i % PALETTE.length]} rx="2" />
          <text x="14" fontSize="10" fill="#4b5563">{String(it).slice(0, 12)}</text>
        </g>
      ))}
    </g>
  );
  const heading = title && <text x={width / 2} y="18" textAnchor="middle" fontSize="13" fontWeight="600" fill="#111827">{title}</text>;

  if (chart.type === "pie") {
    const vals = series[0].values.map((v) => Math.max(0, v));
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = width / 2;
    const cy = top + (height - top - 30) / 2;
    const rad = Math.max(10, Math.min(width, height - top - 30) / 2 - 8);
    let a0 = -Math.PI / 2;
    return (
      <svg width={width} height={height}>
        {heading}
        {vals.map((v, i) => {
          const a1 = a0 + (v / total) * Math.PI * 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = vals.length === 1 || v === total ? `M ${cx} ${cy - rad} A ${rad} ${rad} 0 1 1 ${cx - 0.01} ${cy - rad} Z` : `M ${cx} ${cy} L ${cx + rad * Math.cos(a0)} ${cy + rad * Math.sin(a0)} A ${rad} ${rad} 0 ${large} 1 ${cx + rad * Math.cos(a1)} ${cy + rad * Math.sin(a1)} Z`;
          a0 = a1;
          return <path key={i} d={d} fill={PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth="1"><title>{`${labels[i]}: ${v}`}</title></path>;
        })}
        {legend(labels.slice(0, 6))}
      </svg>
    );
  }

  const all = series.flatMap((s) => s.values);
  const lo = Math.min(0, ...all);
  const hi = Math.max(0, ...all);
  const top2 = nice(hi - lo === 0 ? 1 : hi) ;
  const maxV = hi <= 0 ? 0 : top2 * (Math.ceil(hi / top2 - 1e-9));
  const minV = lo < 0 ? -nice(-lo) * Math.ceil(-lo / nice(-lo) - 1e-9) : 0;
  const span = maxV - minV || 1;
  const y = (v) => top + ph - ((v - minV) / span) * ph;
  const n = labels.length;
  const band = pw / n;
  const x = (i) => left + band * i + band / 2;
  const ticks = Array.from({ length: 5 }, (_, i) => minV + (span * i) / 4);
  const step = Math.ceil(n / Math.max(1, Math.floor(pw / 48)));

  return (
    <svg width={width} height={height}>
      {heading}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={left} x2={left + pw} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
          <text x={left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#6b7280">{fmt(t)}</text>
        </g>
      ))}
      {labels.map((l, i) => i % step === 0 && <text key={i} x={x(i)} y={top + ph + 14} textAnchor="middle" fontSize="10" fill="#6b7280">{l.slice(0, 10)}</text>)}
      {chart.type === "bar" &&
        series.map((s, si) => {
          const bw = Math.max(2, (band * 0.7) / series.length);
          return s.values.map((v, i) => (
            <rect key={`${si}-${i}`} x={x(i) - (bw * series.length) / 2 + si * bw} y={Math.min(y(v), y(0))} width={bw - 1} height={Math.abs(y(v) - y(0))} fill={PALETTE[si % PALETTE.length]} rx="1">
              <title>{`${s.name} · ${labels[i]}: ${v}`}</title>
            </rect>
          ));
        })}
      {(chart.type === "line" || chart.type === "area") &&
        series.map((s, si) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
          return (
            <g key={si}>
              {chart.type === "area" && <polygon points={`${x(0)},${y(0)} ${pts.join(" ")} ${x(n - 1)},${y(0)}`} fill={PALETTE[si % PALETTE.length]} opacity="0.25" />}
              <polyline points={pts.join(" ")} fill="none" stroke={PALETTE[si % PALETTE.length]} strokeWidth="2" />
              {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={PALETTE[si % PALETTE.length]}><title>{`${s.name} · ${labels[i]}: ${v}`}</title></circle>)}
            </g>
          );
        })}
      <line x1={left} x2={left + pw} y1={y(0)} y2={y(0)} stroke="#9ca3af" />
      {legendH > 0 && legend(series.map((s) => s.name))}
    </svg>
  );
}

/** Floating, draggable, resizable charts that live on the sheet. */
export default function ChartLayer({ sheet }) {
  const ev = useEvaluator();
  const updateChart = useStore((s) => s.updateChart);
  const removeChart = useStore((s) => s.removeChart);
  const openDialog = useStore((s) => s.openDialog);
  const begin = useStore((s) => s.beginTransient);
  const end = useStore((s) => s.endTransient);
  const rendered = useMemo(() => sheet.charts.map((ch) => ({ ch, data: chartData(ch, ev, sheet.id) })), [sheet.charts, ev, sheet.id]);

  const drag = (e, ch, mode) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const sy = e.clientY;
    begin();
    const move = (ev2) => {
      const dx = ev2.clientX - sx;
      const dy = ev2.clientY - sy;
      if (mode === "move") updateChart(ch.id, { x: Math.max(HEADER_WIDTH, ch.x + dx), y: Math.max(HEADER_HEIGHT, ch.y + dy) }, true);
      else updateChart(ch.id, { w: Math.max(160, ch.w + dx), h: Math.max(110, ch.h + dy) }, true);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      end();
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return rendered.map(({ ch, data }) => (
    <div key={ch.id} className="xs-chart" style={{ left: ch.x, top: ch.y, width: ch.w, height: ch.h }} onMouseDown={(e) => e.stopPropagation()}>
      <div className="xs-chart-bar" onMouseDown={(e) => drag(e, ch, "move")} onDoubleClick={() => openDialog("chart", { id: ch.id })} title="Drag to move · double-click to edit">
        <span>{ch.title || "Chart"} · {ch.range}</span>
        <button onMouseDown={(e) => e.stopPropagation()} onClick={() => removeChart(ch.id)} aria-label="Delete chart"><X size={12} /></button>
      </div>
      <ChartSvg chart={ch} data={data} width={ch.w} height={ch.h - 24} />
      <div className="xs-chart-grip" onMouseDown={(e) => drag(e, ch, "resize")} />
    </div>
  ));
}
