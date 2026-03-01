/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * CAGR = (currentValue / investedAmount)^(1 / years) - 1
 */
export function calculateCAGR(
  investedAmount: number,
  currentValue: number,
  purchaseDateStr: string,
): number | null {
  if (investedAmount <= 0 || currentValue <= 0) return null;
  const purchaseDate = new Date(purchaseDateStr);
  const now = new Date();
  const years =
    (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years <= 0) return null;
  return Math.pow(currentValue / investedAmount, 1 / years) - 1;
}

/**
 * Calculate XIRR (Extended Internal Rate of Return) using Newton-Raphson iteration.
 * cashFlows: array of { amount: number (negative = outflow), date: Date }
 * Returns annualized rate or null if it doesn't converge.
 */
export function calculateXIRR(
  cashFlows: { amount: number; date: Date }[],
): number | null {
  if (cashFlows.length < 2) return null;

  const dates = cashFlows.map((cf) => cf.date);
  const amounts = cashFlows.map((cf) => cf.amount);
  const t0 = dates[0];

  function npv(rate: number): number {
    return amounts.reduce((sum, amount, i) => {
      const years =
        (dates[i].getTime() - t0.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return sum + amount / Math.pow(1 + rate, years);
    }, 0);
  }

  function dnpv(rate: number): number {
    return amounts.reduce((sum, amount, i) => {
      const years =
        (dates[i].getTime() - t0.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (years === 0) return sum;
      return sum + (-years * amount) / Math.pow(1 + rate, years + 1);
    }, 0);
  }

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate);
    const df = dnpv(rate);
    if (Math.abs(df) < 1e-12) break;
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 1e-7) return newRate;
    rate = newRate;
    if (rate < -0.999) rate = -0.999;
  }
  return null;
}

/**
 * Build XIRR cash flows for a portfolio of holdings.
 * Each holding contributes: -investedAmount on purchaseDate, +currentValue today.
 */
export function buildPortfolioCashFlows(
  holdings: { investedAmount: number; currentValue: number; purchaseDate: string }[],
): { amount: number; date: Date }[] {
  const today = new Date();
  const flows: { amount: number; date: Date }[] = [];

  for (const h of holdings) {
    if (h.investedAmount <= 0) continue;
    flows.push({ amount: -h.investedAmount, date: new Date(h.purchaseDate) });
    flows.push({ amount: h.currentValue, date: today });
  }

  // Sort by date ascending (required for XIRR)
  flows.sort((a, b) => a.date.getTime() - b.date.getTime());
  return flows;
}

export function formatReturn(rate: number | null): string {
  if (rate === null) return "N/A";
  const pct = rate * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
