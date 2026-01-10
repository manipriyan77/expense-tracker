import { z } from "zod";

export const stockFormSchema = z.object({
  name: z.string().min(1, "Company name is required").max(100, "Name must be less than 100 characters"),
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be less than 10 characters"),
  shares: z.number().min(0.01, "Shares must be greater than 0"),
  avgPurchasePrice: z.number().min(0.01, "Purchase price must be greater than 0"),
  currentPrice: z.number().min(0.01, "Current price must be greater than 0"),
  investedAmount: z.number().min(0, "Invested amount cannot be negative"),
  currentValue: z.number().min(0, "Current value cannot be negative"),
  purchaseDate: z.string().optional(),
  sector: z.string().min(1, "Sector is required"),
});

export type StockFormData = z.infer<typeof stockFormSchema>;
