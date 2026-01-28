import { z } from "zod";

export const stockFormSchema = z.object({
  name: z.string().min(1, "Company name is required").max(100, "Name must be less than 100 characters"),
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be less than 10 characters"),
  shares: z.number().min(0.01, "Shares must be greater than 0"),
  avgPurchasePrice: z.number().min(0.01, "Purchase price must be greater than 0"),
  currentPrice: z.number().min(0.01, "Current price must be greater than 0"),
  // Derived values; default to 0 so missing fields don't block submit
  investedAmount: z.number().min(0, "Invested amount cannot be negative").default(0),
  currentValue: z.number().min(0, "Current value cannot be negative").default(0),
  purchaseDate: z.string().optional(),
  sector: z
    .enum([
      "consumer_discretionary",
      "communication_services",
      "consumer_staples",
      "energy",
      "financials",
      "health_care",
      "industrials",
      "information_technology",
      "materials",
      "real_estate",
      "utilities",
      "etf",
      "other",
    ])
    .default("consumer_discretionary"),
  subSector: z
    .enum([
      // Consumer Discretionary sub-sectors
      "auto_parts",
      "tires_rubber",
      "four_wheelers",
      "three_wheelers",
      "two_wheelers",
      "cycles",
      "education_services",
      "wellness_services",
      "hotels_resorts_cruise",
      "restaurants_cafes",
      "theme_parks_gaming",
      "tour_travel_services",
      "home_electronics_appliances",
      "home_furnishing",
      "housewares",
      "retail_apparel",
      "retail_department_stores",
      "retail_online",
      "retail_speciality",
      "apparel_accessories",
      "footwear",
      "precious_metals_jewellery",
      "textiles",
      "other",
    ])
    .default("auto_parts"),
  stockType: z
    .enum(["large_cap", "mid_cap", "small_cap", "etf", "other"])
    .default("large_cap"),
});

export type StockFormData = z.infer<typeof stockFormSchema>;
