import { z } from "zod";

export const goalFormSchema = z.object({
  title: z.string().min(1, "Goal title is required").max(100, "Title must be less than 100 characters"),
  targetAmount: z.number().min(0.01, "Target amount must be greater than 0"),
  currentAmount: z.number().min(0, "Current amount cannot be negative").default(0),
  targetDate: z.string().min(1, "Target date is required"),
  category: z.string().default("General"),
});

export type GoalFormData = z.infer<typeof goalFormSchema>;
