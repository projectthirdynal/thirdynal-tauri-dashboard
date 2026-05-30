import { create } from 'zustand';
import { tauriInvoke } from '@/lib/tauri';
import { RTSRecord, RTSPhoto, RTSScanLog, RTSStats } from '@/types';

interface RTSState {
  records: RTSRecord[];
  photos: RTSPhoto[];
  scanLogs: RTSScanLog[];
  stats: RTSStats | null;
  isLoading: boolean;
  error: string | null;
  loadRecords: (filters?: Record<string, unknown>) => Promise<void>;
  loadPhotos: (recordId: number) => Promise<void>;
  loadStats: () => Promise<void>;
  saveRecord: (record: Record<string, unknown>) => Promise<number>;
  updateStatus: (id: number, status: string) => Promise<void>;
  uploadPhoto: (payload: Record<string, unknown>) => Promise<number>;
  addScanLog: (log: Record<string, unknown>) => Promise<void>;
  checkDuplicate: (waybill: string) => Promise<RTSRecord | null>;
  clearError: () => void;
}

export const useRTSStore = create<RTSState>((set, get) => ({
  records: [],
  photos: [],
  scanLogs: [],
  stats: null,
  isLoading: false,
  error: null,

  loadRecords: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const rows = await tauriInvoke<RTSRecord[]>('get_rts_records', { filters: filters || null });
      set({ records: rows, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  loadPhotos: async (recordId) => {
    try {
      const rows = await tauriInvoke<RTSPhoto[]>('get_rts_photos', { recordId });
      set({ photos: rows });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadStats: async () => {
    try {
      const s = await tauriInvoke<RTSStats>('get_rts_stats');
      set({ stats: s });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  saveRecord: async (record) => {
    const id = await tauriInvoke<number>('save_rts_record', { record });
    return id;
  },

  updateStatus: async (id, status) => {
    await tauriInvoke('update_rts_record_status', { id, status });
    await get().loadRecords();
  },

  uploadPhoto: async (payload) => {
    const id = await tauriInvoke<number>('upload_rts_photo', { payload });
    return id;
  },

  addScanLog: async (log) => {
    await tauriInvoke('add_rts_scan_log', { log });
  },

  checkDuplicate: async (waybill) => {
    try {
      const record = await tauriInvoke<RTSRecord | null>('get_rts_record_by_waybill', { waybill });
      return record;
    } catch {
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
