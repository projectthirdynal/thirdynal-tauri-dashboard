import { create } from 'zustand';
import { tauriInvoke } from '@/lib/tauri';
import { AnalyticsDataset, AnalyticsBrandData, AnalyticsRegionData } from '@/types';

interface DatasetState {
  datasets: AnalyticsDataset[];
  selectedDatasetId: string | null;
  brandData: AnalyticsBrandData[];
  regionData: AnalyticsRegionData[];
  isLoading: boolean;
  error: string | null;
  loadDatasets: () => Promise<void>;
  selectDataset: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useDatasetStore = create<DatasetState>((set, get) => ({
  datasets: [],
  selectedDatasetId: null,
  brandData: [],
  regionData: [],
  isLoading: false,
  error: null,

  loadDatasets: async () => {
    set({ isLoading: true, error: null });
    try {
      const datasets = await tauriInvoke<AnalyticsDataset[]>('get_analytics_datasets');
      set({ datasets, isLoading: false });
      if (datasets.length > 0 && !get().selectedDatasetId) {
        await get().selectDataset(datasets[0].id);
      }
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  selectDataset: async (id: string) => {
    set({ selectedDatasetId: id, isLoading: true, error: null });
    try {
      const [brandData, regionData] = await Promise.all([
        tauriInvoke<AnalyticsBrandData[]>('get_analytics_brand_data', { datasetId: id }),
        tauriInvoke<AnalyticsRegionData[]>('get_analytics_region_data', { datasetId: id }),
      ]);
      set({ brandData, regionData, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
