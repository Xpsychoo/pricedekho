import { TrendingUp } from "lucide-react";
import { formatINR, formatTimestampIST, type PriceObservation } from "@pricedekho/shared";
import { EmptyState } from "./States";

const COLORS = ["#4f46e5", "#0891b2", "#db2777", "#ca8a04", "#16a34a", "#9333ea"];
const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 72 };

/**
 * Step chart of recorded price observations, one line per store. Rendered on
 * the server as SVG. Only real observations are plotted — no interpolation
 * beyond holding the last observed price until the next one, and no
 * extrapolation past the last observation. A data table is provided for
 * screen readers.
 */
export function PriceHistoryChart({ observations }: { observations: PriceObservation[] }) {
  if (observations.length < 2) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No price history yet"
        description="Price history appears after an authorised data source has recorded at least two observations. We never fill gaps with estimated prices."
      />
    );
  }

  const byStore = new Map<string, PriceObservation[]>();
  for (const o of observations) byStore.set(o.storeName, [...(byStore.get(o.storeName) ?? []), o]);

  const times = observations.map((o) => new Date(o.observedAt).getTime());
  const prices = observations.map((o) => o.pricePaise);
  const [tMin, tMax] = [Math.min(...times), Math.max(...times)];
  const [pMinRaw, pMaxRaw] = [Math.min(...prices), Math.max(...prices)];
  const padP = Math.max((pMaxRaw - pMinRaw) * 0.1, pMaxRaw * 0.02);
  const [pMin, pMax] = [Math.max(0, pMinRaw - padP), pMaxRaw + padP];
  const x = (t: number) => PAD.left + ((t - tMin) / Math.max(1, tMax - tMin)) * (W - PAD.left - PAD.right);
  const y = (p: number) => PAD.top + (1 - (p - pMin) / Math.max(1, pMax - pMin)) * (H - PAD.top - PAD.bottom);
  const ticks = [pMin, (pMin + pMax) / 2, pMax];
  const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="price-history-title">
        <title id="price-history-title">Recorded price history by store</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px]">
              {formatINR(Math.round(t / 100) * 100)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 8} className="fill-slate-500 text-[11px]">{dateFmt.format(tMin)}</text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" className="fill-slate-500 text-[11px]">{dateFmt.format(tMax)}</text>
        {[...byStore.entries()].map(([store, points], i) => {
          const d = points
            .map((p, j) => {
              const px = x(new Date(p.observedAt).getTime());
              const py = y(p.pricePaise);
              return j === 0 ? `M${px},${py}` : `H${px} V${py}`;
            })
            .join(" ");
          return (
            <g key={store}>
              <path d={d} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
              {points.map((p) => (
                <circle key={p.observedAt} cx={x(new Date(p.observedAt).getTime())} cy={y(p.pricePaise)} r={3} fill={COLORS[i % COLORS.length]} />
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
        {[...byStore.keys()].map((store, i) => (
          <span key={store} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
            {store}
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>Recorded price observations</caption>
        <thead>
          <tr>
            <th scope="col">Store</th>
            <th scope="col">Observed</th>
            <th scope="col">Price</th>
          </tr>
        </thead>
        <tbody>
          {observations.map((o) => (
            <tr key={`${o.offerId}-${o.observedAt}`}>
              <td>{o.storeName}</td>
              <td>{formatTimestampIST(o.observedAt)}</td>
              <td>{formatINR(o.pricePaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
