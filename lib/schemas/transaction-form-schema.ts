import { z } from "zod";

export const transactionFormSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().min(1, "Description is required").max(200, "Description must be less than 200 characters"),
  category: z.string().min(1, "Category is required"),
  date: z.string().optional(),
  type: z.enum(["income", "expense"], {
    errorMap: () => ({ message: "Type must be either income or expense" }),
  }),
});

export type TransactionFormData = z.infer<typeof transactionFormSchema>;
