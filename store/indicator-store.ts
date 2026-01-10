import { create } from "zustand";

// ==============================================
// TYPES
// ==============================================

export interface TrendDataItem {
  DataIndicator_Aggregation_SKey: number;
  DataSourceName: string;
  IndicatorName: string;
  AggregateColumn: string;
  CountryName: string | null;
  RegionName: string | null;
  IncomeGroup: string | null;
  ReportingYear: number;
  DataIndicatorValue: number;
}

interface TrendDataResponse {
  TrendData: TrendDataItem[];
}

interface IndicatorState {
  trendData: TrendDataResponse | null;
  loading: boolean;
  error: string | null;
  fetchTrendData: (
    indicatorName: string,
    dataSourceName: string,
    classification: string
  ) => Promise<void>;
  clearTrendData: () => void;
}

// ==============================================
// STORE
// ==============================================

export const useIndicatorStore = create<IndicatorState>((set) => ({
  trendData: null,
  loading: false,
  error: null,

  fetchTrendData: async (
    indicatorName: string,
    dataSourceName: string,
    classification: string
  ) => {
    set({ loading: true, error: null });
    try {
      console.log("Fetching trend data for:", {
        indicatorName,
        dataSourceName,
        classification,
      });

      const response = await fetch(
        `http://localhost:5000/api/SynapseCache/GetTrendData?IndicatorName=${encodeURIComponent(
          indicatorName
        )}&DataSourceName=${encodeURIComponent(
          dataSourceName
        )}&Classification=${classification}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      set({ trendData: data, loading: false, error: null });
    } catch (error) {
      console.error("Error fetching trend data:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to fetch trend data",
        loading: false,
      });
    }
  },

  clearTrendData: () => {
    set({ trendData: null, error: null });
  },
}));

