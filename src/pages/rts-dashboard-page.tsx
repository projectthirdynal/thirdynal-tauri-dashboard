import { useEffect, useMemo, useState } from 'react';
import { useRTSStore } from '@/stores/rts-store';
import { tauriInvoke } from '@/lib/tauri';
import {
  Search, Package, CheckCircle, AlertTriangle, Clock,
  RotateCcw, ShieldAlert, Camera, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { RTSRecord, RTSPhoto } from '@/types';

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

const STATUS_COLORS: Record<string, string> = {
  scanned: 'bg-blue-100 text-blue-700',
  pending_verification: 'bg-amber-100 text-amber-700',
  verified: 'bg-emerald-100 text-emerald-700',
  duplicate: 'bg-purple-100 text-purple-700',
  issue: 'bg-red-100 text-red-700',
  returned_to_supplier: 'bg-slate-100 text-slate-700',
  disposed: 'bg-gray-100 text-gray-700',
};

const STATUS_OPTIONS = ['scanned', 'pending_verification', 'verified', 'duplicate', 'issue', 'returned_to_supplier', 'disposed'];

export function RTSDashboardPage() {
  const { records, stats, isLoading, loadRecords, loadStats, updateStatus } = useRTSStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<RTSPhoto[]>([]);

  useEffect(() => {
    loadRecords();
    loadStats();
  }, [loadRecords, loadStats]);

  const filtered = useMemo(() => {
    let rows = records;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        r.waybill_number.toLowerCase().includes(q) ||
        (r.courier?.toLowerCase() || '').includes(q) ||
        (r.staff_name?.toLowerCase() || '').includes(q)
      );
    }
    if (statusFilter) {
      rows = rows.filter((r) => r.rts_status === statusFilter);
    }
    return rows;
  }, [records, search, statusFilter]);

  async function toggleExpand(record: RTSRecord) {
    if (expandedId === record.id) {
      setExpandedId(null);
      setPhotos([]);
    } else {
      setExpandedId(record.id);
      try {
        const p = await tauriInvoke<RTSPhoto[]>('get_rts_photos', { recordId: record.id });
        setPhotos(p);
      } catch {
        setPhotos([]);
      }
    }
  }

  async function handleStatusChange(id: number, status: string) {
    await updateStatus(id, status);
    await loadStats();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">RTS Dashboard</h2>
        <p className="text-muted-foreground">View, filter, and manage scanned RTS records.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KPICard label="Today" value={(stats?.today ?? 0).toLocaleString()} icon={Clock} />
        <KPICard label="This Week" value={(stats?.week ?? 0).toLocaleString()} icon={Package} />
        <KPICard label="This Month" value={(stats?.month ?? 0).toLocaleString()} icon={CheckCircle} />
        <KPICard label="Duplicates" value={(stats?.duplicates ?? 0).toLocaleString()} icon={ShieldAlert} tone="amber" />
        <KPICard label="Pending" value={(stats?.pending ?? 0).toLocaleString()} icon={AlertTriangle} tone="red" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search waybill, courier, or staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button
          onClick={() => { loadRecords(); loadStats(); }}
          className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
        >
          <RotateCcw size={14} className="inline mr-1" /> Refresh
        </button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Waybill</th>
                <th className="px-4 py-2 text-left font-medium">Courier</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Staff</th>
                <th className="px-4 py-2 text-left font-medium">Branch</th>
                <th className="px-4 py-2 text-right font-medium">Photos</th>
                <th className="px-4 py-2 text-left font-medium">Scanned</th>
                <th className="px-4 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No records found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <>
                    <tr key={r.id} className="border-t hover:bg-accent/40">
                      <td className="px-4 py-2 font-medium">{r.waybill_number}</td>
                      <td className="px-4 py-2">{r.courier}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.rts_status] || 'bg-gray-100 text-gray-700'}`}>
                          {r.rts_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2">{r.staff_name || '-'}</td>
                      <td className="px-4 py-2">{r.branch || '-'}</td>
                      <td className="px-4 py-2 text-right">
                        {r.photo_count ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Camera size={12} /> {r.photo_count}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {r.scanned_at ? new Date(r.scanned_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpand(r)}
                            className="rounded-md border p-1 text-muted-foreground hover:bg-accent"
                            title="View photos / details"
                          >
                            {expandedId === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {r.rts_status === 'pending_verification' && (
                            <button
                              onClick={() => handleStatusChange(r.id, 'verified')}
                              className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                            >
                              Verify
                            </button>
                          )}
                          {r.rts_status === 'scanned' && (
                            <button
                              onClick={() => handleStatusChange(r.id, 'pending_verification')}
                              className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-500"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr className="border-t bg-muted/30">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                              <span><strong>Remark:</strong> {r.remark_code?.replace(/_/g, ' ') || '-'}</span>
                              <span><strong>Note:</strong> {r.remark_text || '-'}</span>
                              <span><strong>Method:</strong> {r.scan_method}</span>
                              <span><strong>Duplicate:</strong> {r.duplicate_flag ? 'Yes' : 'No'}</span>
                            </div>
                            <div>
                              <label className="text-xs font-semibold uppercase text-muted-foreground">Change Status</label>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => handleStatusChange(r.id, s)}
                                    className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                                      r.rts_status === s
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-muted-foreground hover:bg-accent'
                                    }`}
                                  >
                                    {s.replace(/_/g, ' ')}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {photos.length > 0 && (
                              <div>
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Photos</label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {photos.map((p) => (
                                    <div key={p.id} className="relative h-20 w-28 overflow-hidden rounded-md border bg-black">
                                      {p.mime_type.startsWith('video') ? (
                                        <div className="flex h-full items-center justify-center text-xs text-white/70">
                                          <Camera size={16} className="mr-1" /> Video
                                        </div>
                                      ) : (
                                        <img
                                          src={`data:image/jpeg;base64,${p.file_path}`}
                                          alt={p.file_name}
                                          className="h-full w-full object-cover"
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
