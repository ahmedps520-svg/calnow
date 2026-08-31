import { useMemo } from 'react';
import { glucoseStatus } from '../lib/format';
import type { GlucoseEntry, Targets } from '../lib/types';

const W = 320;

/* -------------------------- glucose scatter ---------------------------- */
export function GlucoseChart({
  readings, targets, days, height = 150, labels,
}: {
  readings: GlucoseEntry[];
  targets: Targets;
  days: number;
  height?: number;
  labels: string[];
}) {
  const H = height;
  const padL = 26;
  const padR = 6;
  const padT = 8;
  const padB = 18;

  const now = Date.now();
  const from = now - days * 86400000;
  const pts = readings.filter((r) => r.ts >= from);

  const values = pts.map((r) => r.mgdl);
  const lo = Math.min(65, ...values, targets.lowMin - 8);
  const hi = Math.max(targets.post1Max + 20, ...values.map((v) => v + 15));
  const x = (ts: number) => padL + ((ts - from) / (now - from)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);

  const bandTop = y(targets.post1Max);
  const bandBottom = y(targets.lowMin);

  const gridValues = [targets.lowMin, targets.post2Max, targets.post1Max].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} height={H} role="img" aria-label="Blood sugar readings">
      <rect x={padL} y={bandTop} width={W - padL - padR} height={Math.max(0, bandBottom - bandTop)} className="chart-band" rx="4" />
      {gridValues.map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="chart-grid" strokeDasharray="3 4" />
          <text x={2} y={y(v) + 3.5} className="chart-axis">{v}</text>
        </g>
      ))}
      {pts.map((r) => {
        const status = glucoseStatus(r.mgdl, r.context, targets);
        const fill = status === 'high' ? 'var(--bad)' : status === 'low' ? 'var(--warn)' : 'var(--good)';
        return <circle key={r.id} cx={x(r.ts)} cy={y(r.mgdl)} r={3.6} fill={fill} opacity={0.9} />;
      })}
      {labels.map((label, i) => (
        <text
          key={label + i}
          x={padL + (i / Math.max(1, labels.length - 1)) * (W - padL - padR)}
          y={H - 4}
          textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
          className="chart-axis"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

/* ---------------------------- daily bars -------------------------------- */
export function DayBars({
  data, target, height = 130, unitLabel,
}: {
  data: { label: string; value: number }[];
  target?: number;
  height?: number;
  unitLabel?: string;
}) {
  const H = height;
  const padT = 10;
  const padB = 18;
  const max = Math.max(target ?? 0, ...data.map((d) => d.value), 1) * 1.15;
  const slot = W / Math.max(1, data.length);
  const barW = Math.min(30, slot * 0.52);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} height={H} role="img" aria-label={unitLabel ?? 'Daily totals'}>
      {target ? (
        <>
          <line x1={0} x2={W} y1={y(target)} y2={y(target)} className="chart-grid" strokeDasharray="4 4" />
          <text x={W - 2} y={y(target) - 4} textAnchor="end" className="chart-axis">{Math.round(target)}</text>
        </>
      ) : null}
      {data.map((d, i) => {
        const cx = slot * i + slot / 2;
        const top = d.value > 0 ? y(d.value) : H - padB;
        const h = Math.max(d.value > 0 ? 3 : 0, H - padB - top);
        const over = target ? d.value > target * 1.05 : false;
        return (
          <g key={d.label + i}>
            <rect
              x={cx - barW / 2}
              y={H - padB - h}
              width={barW}
              height={h}
              rx={Math.min(6, barW / 2)}
              fill={d.value === 0 ? 'var(--surface-sunken)' : over ? 'var(--warn)' : 'var(--accent)'}
              opacity={d.value === 0 ? 1 : 0.92}
            />
            <text x={cx} y={H - 4} textAnchor="middle" className="chart-axis">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------- sparkline --------------------------------- */
export function Sparkline({ values, height = 44 }: { values: number[]; height?: number }) {
  const path = useMemo(() => {
    const pts = values.filter((v) => Number.isFinite(v));
    if (pts.length < 2) return '';
    const lo = Math.min(...pts);
    const hi = Math.max(...pts);
    const span = hi - lo || 1;
    return pts
      .map((v, i) => {
        const x = (i / (pts.length - 1)) * W;
        const y = 4 + (1 - (v - lo) / span) * (height - 8);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [values, height]);

  if (!path) return null;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} height={height} aria-hidden>
      <path d={path} className="chart-line" />
    </svg>
  );
}
