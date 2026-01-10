import { z } from "zod";

export const mutualFundFormSchema = z.object({
  name: z.string().min(1, "Fund name is required").max(100, "Name must be less than 100 characters"),
  symbol: z.string().min(1, "Symbol is required").max(20, "Symbol must be less than 20 characters"),
  investedAmount: z.number().min(0.01, "Invested amount must be greater than 0"),
  units: z.number().min(0.01, "Units must be greater than 0"),
  nav: z.number().min(0.01, "NAV must be greater than 0"),
  currentValue: z.number().min(0, "Current value cannot be negative"),
  purchaseDate: z.string().optional(),
  category: z.string().min(1, "Category is required"),
});

export type MutualFundFormData = z.infer<typeof mutualFundFormSchema>;
