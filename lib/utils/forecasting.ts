/**
 * Advanced Forecasting Utilities
 * Provides multiple forecasting models for financial predictions
 */

export interface DataPoint {
  date: string;
  value: number;
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number; // Lower confidence bound
  upper: number; // Upper confidence bound
  actual?: number; // For comparison with real data
}

export interface ForecastResult {
  method: string;
  forecasts: ForecastPoint[];
  accuracy?: number; // MAE or RMSE
  trend: "increasing" | "decreasing" | "stable";
  seasonality: boolean;
}

/**
 * Simple Moving Average (SMA)
 */
export function simpleMovingAverage(data: DataPoint[], window: number = 3): number {
  if (data.length === 0) return 0;
  const recentData = data.slice(-window);
  const sum = recentData.reduce((acc, point) => acc + point.value, 0);
  return sum / recentData.length;
}

/**
 * Exponential Moving Average (EMA)
 */
export function exponentialMovingAverage(data: DataPoint[], alpha: number = 0.3): number {
  if (data.length === 0) return 0;
  if (data.length === 1) return data[0].value;
  
  let ema = data[0].value;
  for (let i = 1; i < data.length; i++) {
    ema = alpha * data[i].value + (1 - alpha) * ema;
  }
  return ema;
}

/**
 * Linear Regression for trend analysis
 */
export function linearRegression(data: DataPoint[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  
  // Convert dates to numeric values (days from first date)
  const firstDate = new Date(data[0].date).getTime();
  const x = data.map((_, i) => i);
  const y = data.map(d => d.value);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R²
  const yMean = sumY / n;
  const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.reduce((acc, yi, i) => {
    const predicted = slope * x[i] + intercept;
    return acc + Math.pow(yi - predicted, 2);
  }, 0);
  const r2 = 1 - (ssResidual / ssTotal);
  
  return { slope, intercept, r2 };
}

/**
 * Detect seasonality in data
 */
export function detectSeasonality(data: DataPoint[]): boolean {
  if (data.length < 12) return false;
  
  // Simple autocorrelation check for monthly seasonality
  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Check autocorrelation at lag 12 (monthly seasonality)
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < values.length - 12; i++) {
    numerator += (values[i] - mean) * (values[i + 12] - mean);
  }
  
  for (let i = 0; i < values.length; i++) {
    denominator += Math.pow(values[i] - mean, 2);
  }
  
  const autocorr = numerator / denominator;
  return Math.abs(autocorr) > 0.3; // Threshold for seasonality
}

/**
 * Calculate Mean Absolute Error
 */
export function calculateMAE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) return 0;
  const errors = actual.map((a, i) => Math.abs(a - predicted[i]));
  return errors.reduce((a, b) => a + b, 0) / errors.length;
}

/**
 * Calculate confidence intervals
 */
function calculateConfidenceInterval(
  value: number,
  stdDev: number,
  multiplier: number = 1.96 // 95% confidence
): { lower: number; upper: number } {
  return {
    lower: Math.max(0, value - multiplier * stdDev),
    upper: value + multiplier * stdDev,
  };
}

/**
 * Linear Trend Forecast
 */
export function linearTrendForecast(
  data: DataPoint[],
  periodsAhead: number
): ForecastResult {
  const { slope, intercept, r2 } = linearRegression(data);
  const lastDate = new Date(data[data.length - 1].date);
  
  // Calculate standard deviation of residuals
  const predictions = data.map((_, i) => slope * i + intercept);
  const residuals = data.map((d, i) => d.value - predictions[i]);
  const stdDev = Math.sqrt(
    residuals.reduce((acc, r) => acc + r * r, 0) / residuals.length
  );
  
  const forecasts: ForecastPoint[] = [];
  for (let i = 1; i <= periodsAhead; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    
    const predicted = slope * (data.length + i) + intercept;
    const { lower, upper } = calculateConfidenceInterval(predicted, stdDev * Math.sqrt(i));
    
    forecasts.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted: Math.max(0, predicted),
      lower,
      upper,
    });
  }
  
  const trend = slope > 0.1 ? "increasing" : slope < -0.1 ? "decreasing" : "stable";
  
  return {
    method: "Linear Trend",
    forecasts,
    accuracy: 1 - Math.abs(r2),
    trend,
    seasonality: detectSeasonality(data),
  };
}

/**
 * Exponential Smoothing Forecast (Holt's Method)
 */
export function exponentialSmoothingForecast(
  data: DataPoint[],
  periodsAhead: number,
  alpha: number = 0.3,
  beta: number = 0.1
): ForecastResult {
  if (data.length < 3) {
    return linearTrendForecast(data, periodsAhead);
  }
  
  // Initialize level and trend
  let level = data[0].value;
  let trend = data[1].value - data[0].value;
  
  // Apply Holt's exponential smoothing
  const smoothedValues: number[] = [data[0].value];
  
  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i].value + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    smoothedValues.push(level + trend);
  }
  
  // Calculate standard deviation for confidence intervals
  const residuals = data.map((d, i) => d.value - smoothedValues[i]);
  const stdDev = Math.sqrt(
    residuals.reduce((acc, r) => acc + r * r, 0) / residuals.length
  );
  
  // Generate forecasts
  const lastDate = new Date(data[data.length - 1].date);
  const forecasts: ForecastPoint[] = [];
  
  for (let i = 1; i <= periodsAhead; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    
    const predicted = level + i * trend;
    const { lower, upper } = calculateConfidenceInterval(predicted, stdDev * Math.sqrt(i));
    
    forecasts.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted: Math.max(0, predicted),
      lower,
      upper,
    });
  }
  
  const trendDirection = trend > 5 ? "increasing" : trend < -5 ? "decreasing" : "stable";
  
  return {
    method: "Exponential Smoothing",
    forecasts,
    accuracy: calculateMAE(data.map(d => d.value), smoothedValues),
    trend: trendDirection,
    seasonality: detectSeasonality(data),
  };
}

/**
 * Moving Average Forecast
 */
export function movingAverageForecast(
  data: DataPoint[],
  periodsAhead: number,
  window: number = 3
): ForecastResult {
  const lastDate = new Date(data[data.length - 1].date);
  const movingAvg = simpleMovingAverage(data, window);
  
  // Calculate volatility (standard deviation of recent data)
  const recentData = data.slice(-window).map(d => d.value);
  const mean = recentData.reduce((a, b) => a + b, 0) / recentData.length;
  const variance = recentData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / recentData.length;
  const stdDev = Math.sqrt(variance);
  
  const forecasts: ForecastPoint[] = [];
  for (let i = 1; i <= periodsAhead; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    
    const { lower, upper } = calculateConfidenceInterval(movingAvg, stdDev * Math.sqrt(i));
    
    forecasts.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted: movingAvg,
      lower,
      upper,
    });
  }
  
  // Determine trend from recent data
  const recentTrend = data.length >= 3 
    ? data[data.length - 1].value - data[data.length - 3].value
    : 0;
  const trend = recentTrend > 10 ? "increasing" : recentTrend < -10 ? "decreasing" : "stable";
  
  return {
    method: "Moving Average",
    forecasts,
    trend,
    seasonality: detectSeasonality(data),
  };
}

/**
 * Ensemble Forecast (combines multiple methods)
 */
export function ensembleForecast(
  data: DataPoint[],
  periodsAhead: number
): ForecastResult {
  if (data.length < 3) {
    return linearTrendForecast(data, periodsAhead);
  }
  
  const linear = linearTrendForecast(data, periodsAhead);
  const exponential = exponentialSmoothingForecast(data, periodsAhead);
  const movingAvg = movingAverageForecast(data, periodsAhead);
  
  // Combine forecasts with weighted average
  const forecasts: ForecastPoint[] = [];
  for (let i = 0; i < periodsAhead; i++) {
    const weights = {
      linear: 0.4,
      exponential: 0.4,
      movingAvg: 0.2,
    };
    
    const predicted = 
      linear.forecasts[i].predicted * weights.linear +
      exponential.forecasts[i].predicted * weights.exponential +
      movingAvg.forecasts[i].predicted * weights.movingAvg;
    
    const lower = Math.min(
      linear.forecasts[i].lower,
      exponential.forecasts[i].lower,
      movingAvg.forecasts[i].lower
    );
    
    const upper = Math.max(
      linear.forecasts[i].upper,
      exponential.forecasts[i].upper,
      movingAvg.forecasts[i].upper
    );
    
    forecasts.push({
      date: linear.forecasts[i].date,
      predicted: Math.max(0, predicted),
      lower,
      upper,
    });
  }
  
  return {
    method: "Ensemble (Combined)",
    forecasts,
    trend: linear.trend,
    seasonality: detectSeasonality(data),
  };
}

/**
 * Prepare monthly data from transactions
 */
export function prepareMonthlyData(
  transactions: Array<{ date: string; amount: number; type: "income" | "expense" }>,
  type: "income" | "expense",
  months: number = 12
): DataPoint[] {
  const now = new Date();
  const monthlyData: Record<string, number> = {};
  
  // Initialize last N months
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = 0;
  }
  
  // Aggregate transactions by month
  transactions
    .filter(t => t.type === type)
    .forEach(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthlyData) {
        monthlyData[key] += t.amount;
      }
    });
  
  // Convert to DataPoint array
  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date: `${date}-01`, value }));
}
