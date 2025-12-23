import { z } from "zod";

export const formSchema = z.object({
  type: z.enum(["income", "expense"], {
    message: "Please select a transaction type",
  }),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  description: z
    .string()
    .min(1, "Description is required")
    .max(100, "Description must be less than 100 characters"),
  category: z.enum(
    [
      "Food",
      "Transportation",
      "Entertainment",
      "Bills",
      "Shopping",
      "Income",
      "Other",
    ],
    {
      message: "Please select a category",
    }
  ),
});

export type FormSchema = z.infer<typeof formSchema>;
