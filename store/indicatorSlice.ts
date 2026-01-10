import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ApiServices } from "../services/ApiServices";
import { Indicator } from "../models/Indicator.type";
import { UiHeaderText } from "../models/UiHeaderText.type";

// ==============================================
// TYPES
// ==============================================

interface TrendDataItem {
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

interface ClassificationData {
  [classification: string]: TrendDataItem[];
}

// ==============================================
// THUNKS
// ==============================================

// Fetch all initial indicator data
export const fetchInitialIndicatorData = createAsyncThunk(
  "indicator/fetchInitial",
  async () => {
    const [allData] = await Promise.all([ApiServices.GetAllDataMI()]);

    return {
      value: allData.ThematicData,
      theme: allData.UiHeaderData,
      CountryData: allData.UiCountriesEligibiliteis,
    };
  }
);

// Fetch map data
export const fetchMapData = createAsyncThunk(
  "indicator/fetchMapData",
  async ({
    indicatorName,
    dataSourceName,
  }: {
    indicatorName: string;
    dataSourceName: string;
  }) => {
    const data = await ApiServices.getMapData(indicatorName, dataSourceName);

    // Convert [{IND:10}, {USA:20}] → { IND:10, USA:20 }
    const transformed: Record<string, number> = {};

    data.AggregationData.forEach((item: any) => {
      transformed[item.CountryCode] = item.DataIndicatorValue;
    });

    return data; // object
  }
);

// Fetch trend data with classification accumulation
export const fetchTrendData = createAsyncThunk(
  "indicator/fetchTrendData",
  async ({
    indicatorName,
    dataSourceName,
    classification,
  }: {
    indicatorName: string;
    dataSourceName: string;
    classification: string;
  }) => {
    console.log("Fetching trend data for classification:", classification);
    const data = await ApiServices.getTrendData(
      indicatorName,
      dataSourceName,
      classification
    );
    console.log("Received data:", data);
    
    // Return both the data and the classification it belongs to
    return { data, classification };
  }
);

// ==============================================
// SLICE
// ==============================================

const indicator = createSlice({
  name: "indicator",
  initialState: {
    value: [] as Indicator[],
    theme: [] as UiHeaderText[],
    CountryData: [] as any[],
    loading: false,

    mapData: {} as Record<string, number>,
    loadingMap: false,
    
    // Trend data with classification accumulation
    trendData: null as TrendDataResponse | null,
    classificationData: {} as ClassificationData,
    loadingClassifications: [] as string[],
    loadingTrend: false,
    trendError: null as string | null,
  },

  reducers: {
    getData: (state) => state,
    
    // Clear all trend data
    clearTrendData: (state) => {
      state.trendData = null;
      state.classificationData = {};
      state.loadingClassifications = [];
      state.trendError = null;
    },
    
    // Remove specific classification data
    removeClassificationData: (state, action: { payload: string; type: string }) => {
      const classification = action.payload;
      delete state.classificationData[classification];
      
      // Recombine remaining data
      const allData: TrendDataItem[] = [];
      const dataArrays = Object.values(state.classificationData) as TrendDataItem[][];
      dataArrays.forEach((dataArray: TrendDataItem[]) => {
        allData.push(...dataArray);
      });
      state.trendData = allData.length > 0 ? { TrendData: allData } : null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Initial Indicator Data
      .addCase(fetchInitialIndicatorData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInitialIndicatorData.fulfilled, (state, action) => {
        state.value = action.payload.value;
        state.theme = action.payload.theme;
        state.CountryData = action.payload.CountryData;
        state.loading = false;
      })
      .addCase(fetchInitialIndicatorData.rejected, (state) => {
        state.loading = false;
      })

      // Map Data
      .addCase(fetchMapData.pending, (state) => {
        state.loadingMap = true;
      })
      .addCase(fetchMapData.fulfilled, (state, action) => {
        state.mapData = action.payload;
        state.loadingMap = false;
      })
      .addCase(fetchMapData.rejected, (state) => {
        state.loadingMap = false;
      })

      // Trend Data with Classification Accumulation
      .addCase(fetchTrendData.pending, (state, action) => {
        const classification = action.meta.arg.classification;
        if (!state.loadingClassifications.includes(classification)) {
          state.loadingClassifications.push(classification);
        }
        state.loadingTrend = true;
        state.trendError = null;
      })
      .addCase(fetchTrendData.fulfilled, (state, action) => {
        const { data, classification } = action.payload;
        
        // Extract the TrendData array from the response
        let trendDataArray: TrendDataItem[] = [];
        if (data && typeof data === 'object' && 'TrendData' in data && Array.isArray(data.TrendData)) {
          trendDataArray = data.TrendData;
        } else if (Array.isArray(data)) {
          trendDataArray = data;
        }
        
        // Store data by classification (accumulate instead of replace)
        state.classificationData[classification] = trendDataArray;
        
        // Combine all classification data into trendData
        const allData: TrendDataItem[] = [];
        const dataArrays = Object.values(state.classificationData) as TrendDataItem[][];
        dataArrays.forEach((dataArray: TrendDataItem[]) => {
          allData.push(...dataArray);
        });
        state.trendData = { TrendData: allData };
        
        // Remove from loading classifications
        state.loadingClassifications = state.loadingClassifications.filter(
          (c: string) => c !== classification
        );
        state.loadingTrend = state.loadingClassifications.length > 0;
        state.trendError = null;
      })
      .addCase(fetchTrendData.rejected, (state, action) => {
        const classification = action.meta.arg.classification;
        state.loadingClassifications = state.loadingClassifications.filter(
          (c: string) => c !== classification
        );
        state.loadingTrend = state.loadingClassifications.length > 0;
        state.trendError = action.error.message || "Failed to fetch trend data";
      });
  },
});

export const { getData, clearTrendData, removeClassificationData } = indicator.actions;
export default indicator.reducer;
