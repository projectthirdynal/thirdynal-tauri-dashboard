import { useEffect, useMemo, useState } from 'react';
import { useDatasetStore } from '@/stores/dataset-store';
import { useAuthStore } from '@/stores/auth-store';
import { tauriInvoke } from '@/lib/tauri';
import { open } from '@tauri-apps/plugin-dialog';
import { Search, TrendingUp, Package, CheckCircle, AlertTriangle, XCircle, RotateCcw, BarChart3, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function KPICard({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: React.ElementType; tone?: string }) {
  const toneClass = tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-slate-700';
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function BrandTrendsPage() {
  const { datasets, selectedDatasetId, brandData, isLoading, loadDatasets, selectDataset } = useDatasetStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'brand' | 'overall' | 'delivered' | 'rts_rate'>('overall');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  async function handleImport() {
    setImporting(true);
    try {
      const filePath = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'Excel', extensions: ['xlsx', 'xls', 'xlsm'] }],
      });
      if (!filePath || Array.isArray(filePath)) {
        setImporting(false);
        return;
      }
      const fileName = filePath.split(/[/\\]/).pop() || 'Imported';
      const res = await tauriInvoke<{ dataset_id: string; row_count: number; brand_count: number; region_count: number }>('import_excel_dataset', {
        payload: {
          file_path: filePath,
          label: fileName,
          imported_by: user?.id ?? null,
        },
      });
      await loadDatasets();
      if (res.dataset_id) await selectDataset(res.dataset_id);
      alert(`Imported ${res.row_count.toLocaleString()} rows, ${res.brand_count} brands, ${res.region_count} regions.`);
    } catch (err) {
      alert('Import error: ' + String(err));
    } finally {
      setImporting(false);
    }
  }

  const filtered = useMemo(() => {
    let rows = brandData.filter((b) => b.brand.toLowerCase().includes(search.toLowerCase()));
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [brandData, search, sortKey, sortDir]);

  const totals = useMemo(() => {
    const overall = brandData.reduce((s, b) => s + b.overall, 0);
    const delivered = brandData.reduce((s, b) => s + b.delivered, 0);
    const forReturn = brandData.reduce((s, b) => s + b.for_return, 0);
    const returned = brandData.reduce((s, b) => s + b.returned, 0);
    const totalRts = brandData.reduce((s, b) => s + b.total_rts, 0);
    const deliveredRate = overall ? (delivered / (delivered + totalRts)) * 100 : 0;
    const rtsRate = overall ? (totalRts / (delivered + totalRts)) * 100 : 0;
    return { overall, delivered, forReturn, returned, totalRts, deliveredRate, rtsRate };
  }, [brandData]);

  const chartData = useMemo(() =>
    filtered.slice(0, 12).map((b) => ({ name: b.brand.slice(0, 14), delivered: b.delivered, rts: b.total_rts })),
    [filtered]
  );

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Brand Trends</h2>
          <p className="text-muted-foreground">Per-brand delivery and RTS analytics.</p>
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
          <button
            onClick={() => loadDatasets()}
            className="rounded-md border p-2 text-muted-foreground hover:bg-accent"
            title="Refresh"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            {importing ? 'Importing…' : 'Import Excel'}
          </button>
        </div>
      </div>

      {selectedDataset && (
        <div className="text-sm text-muted-foreground">
          Source: <span className="font-medium text-foreground">{selectedDataset.label}</span> · {selectedDataset.row_count.toLocaleString()} rows · {brandData.length} brands
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="cursor-pointer px-4 py-2 text-left font-medium" onClick={() => handleSort('brand')}>Brand {sortKey === 'brand' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                    <th className="cursor-pointer px-4 py-2 text-right font-medium" onClick={() => handleSort('overall')}>Overall {sortKey === 'overall' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-4 py-2 text-right font-medium text-emerald-600">Delivered</th>
                    <th className="px-4 py-2 text-right font-medium text-amber-600">For Return</th>
                    <th className="px-4 py-2 text-right font-medium text-red-600">Returned</th>
                    <th className="px-4 py-2 text-right font-medium text-red-600">Total RTS</th>
                    <th className="cursor-pointer px-4 py-2 text-right font-medium" onClick={() => handleSort('rts_rate')}>RTS % {sortKey === 'rts_rate' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No brands found.</td></tr>
                  ) : (
                    filtered.map((b) => (
                      <tr key={b.id} className="border-t hover:bg-accent/40">
                        <td className="px-4 py-2 font-medium">{b.brand}</td>
                        <td className="px-4 py-2 text-right">{b.overall.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-emerald-600">{b.delivered.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-amber-600">{b.for_return.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-red-600">{b.returned.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-red-600">{b.total_rts.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{b.rts_rate.toFixed(1)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Top Brands — Delivered vs RTS</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Bar dataKey="delivered" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="rts" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
