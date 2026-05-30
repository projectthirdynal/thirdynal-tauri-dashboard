import { useEffect, useMemo, useState } from 'react';
import { useDatasetStore } from '@/stores/dataset-store';
import { Search, MapPin, Package, CheckCircle, AlertTriangle, XCircle, RotateCcw, BarChart3, TrendingUp } from 'lucide-react';

function KPICard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ElementType; tone?: string }) {
  const toneClass = tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-slate-700';
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

const REGIONS = ['ALL', 'LUZON', 'MANILA', 'VISAYAS', 'MINDANAO'] as const;

export function ByRegionPage() {
  const { datasets, selectedDatasetId, regionData, isLoading, loadDatasets, selectDataset } = useDatasetStore();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<(typeof REGIONS)[number]>('ALL');

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  const filtered = useMemo(() => {
    let rows = regionData;
    if (regionFilter !== 'ALL') {
      rows = rows.filter((r) => r.region === regionFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (r.province?.toLowerCase() || '').includes(q) ||
        (r.city?.toLowerCase() || '').includes(q) ||
        (r.region?.toLowerCase() || '').includes(q)
      );
    }
    return rows;
  }, [regionData, regionFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const row of filtered) {
      const key = row.region;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries()).sort((a, b) => REGIONS.indexOf(a[0] as (typeof REGIONS)[number]) - REGIONS.indexOf(b[0] as (typeof REGIONS)[number]));
  }, [filtered]);

  const totals = useMemo(() => {
    const overall = regionData.reduce((s, r) => s + r.overall, 0);
    const delivered = regionData.reduce((s, r) => s + r.delivered, 0);
    const forReturn = regionData.reduce((s, r) => s + r.for_return, 0);
    const returned = regionData.reduce((s, r) => s + r.returned, 0);
    const totalRts = regionData.reduce((s, r) => s + r.total_rts, 0);
    const deliveredRate = overall ? (delivered / (delivered + totalRts)) * 100 : 0;
    const rtsRate = overall ? (totalRts / (delivered + totalRts)) * 100 : 0;
    return { overall, delivered, forReturn, returned, totalRts, deliveredRate, rtsRate };
  }, [regionData]);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">By Region Overall</h2>
          <p className="text-muted-foreground">Per-province and city grouped by region.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={selectedDatasetId ?? ''}
            onChange={(e) => e.target.value && selectDataset(e.target.value)}
          >
            <option value="">Select dataset…</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} ({d.row_count.toLocaleString()} rows)
              </option>
            ))}
          </select>
          <button onClick={() => loadDatasets()} className="rounded-md border p-2 text-muted-foreground hover:bg-accent" title="Refresh">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {selectedDataset && (
        <div className="text-sm text-muted-foreground">
          Source: <span className="font-medium text-foreground">{selectedDataset.label}</span> · {selectedDataset.row_count.toLocaleString()} rows · {regionData.length} locations
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <KPICard label="Overall" value={totals.overall.toLocaleString()} icon={Package} />
        <KPICard label="Delivered" value={totals.delivered.toLocaleString()} icon={CheckCircle} tone="green" />
        <KPICard label="For Return" value={totals.forReturn.toLocaleString()} icon={AlertTriangle} tone="amber" />
        <KPICard label="Returned" value={totals.returned.toLocaleString()} icon={XCircle} tone="red" />
        <KPICard label="Total RTS" value={totals.totalRts.toLocaleString()} icon={RotateCcw} tone="red" />
        <KPICard label="Delivered %" value={`${totals.deliveredRate.toFixed(1)}%`} icon={TrendingUp} tone="green" />
        <KPICard label="RTS %" value={`${totals.rtsRate.toFixed(1)}%`} icon={BarChart3} tone="red" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search province or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                regionFilter === r
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : grouped.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No region data found.</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([region, rows]) => {
            const regionTotals = rows.reduce(
              (acc, r) => ({
                overall: acc.overall + r.overall,
                delivered: acc.delivered + r.delivered,
                forReturn: acc.forReturn + r.for_return,
                returned: acc.returned + r.returned,
                totalRts: acc.totalRts + r.total_rts,
              }),
              { overall: 0, delivered: 0, forReturn: 0, returned: 0, totalRts: 0 }
            );
            const rRate = regionTotals.overall
              ? (regionTotals.totalRts / (regionTotals.delivered + regionTotals.totalRts)) * 100
              : 0;
            return (
              <div key={region} className="rounded-lg border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-muted-foreground" />
                    <span className="font-semibold">{region}</span>
                    <span className="text-xs text-muted-foreground">({rows.length} locations)</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Overall: <strong className="text-foreground">{regionTotals.overall.toLocaleString()}</strong></span>
                    <span>Delivered: <strong className="text-emerald-600">{regionTotals.delivered.toLocaleString()}</strong></span>
                    <span>RTS: <strong className="text-red-600">{regionTotals.totalRts.toLocaleString()}</strong></span>
                    <span>RTS %: <strong className="text-red-600">{rRate.toFixed(1)}%</strong></span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Province</th>
                        <th className="px-4 py-2 text-left font-medium">City</th>
                        <th className="px-4 py-2 text-right font-medium">Overall</th>
                        <th className="px-4 py-2 text-right font-medium text-emerald-600">Delivered</th>
                        <th className="px-4 py-2 text-right font-medium text-amber-600">For Return</th>
                        <th className="px-4 py-2 text-right font-medium text-red-600">Returned</th>
                        <th className="px-4 py-2 text-right font-medium text-red-600">Total RTS</th>
                        <th className="px-4 py-2 text-right font-medium">RTS %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-t hover:bg-accent/40">
                          <td className="px-4 py-2">{r.province || '-'}</td>
                          <td className="px-4 py-2">{r.city || '-'}</td>
                          <td className="px-4 py-2 text-right">{r.overall.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right text-emerald-600">{r.delivered.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right text-amber-600">{r.for_return.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right text-red-600">{r.returned.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right text-red-600">{r.total_rts.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{r.rts_rate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
