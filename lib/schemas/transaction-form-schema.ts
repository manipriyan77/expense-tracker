import { z } from "zod";

export const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  description: z.string().min(1, "Description is required").max(200, "Description must be less than 200 characters"),
  category: z.string().min(1, "Category is required"),
  subtype: z.string().optional(),
  budgetId: z.string().optional(),
  goalId: z.string().optional(),
  date: z.string().optional(),
  isRecurring: z.boolean().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
}).refine(
  (data) => {
    // Budget is mandatory for expense transactions
    if (data.type === "expense" && !data.budgetId) {
      return false;
    }
    return true;
  },
  {
    message: "Budget selection is required for expense transactions",
    path: ["budgetId"],
  }
);

export type TransactionFormData = z.infer<typeof transactionFormSchema>;

