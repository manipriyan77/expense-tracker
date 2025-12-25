import { z } from "zod";

export const signUpFormSchema = z
  .object({
    email: z.string().email("Enter a proper email"),
    password: z
      .string()
      .min(8, { message: "Password must be atleast 8 characters" })
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
    userName: z
      .string()
      .min(5, { message: "Username is to short" })
      .max(15, { message: "Username is too long" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpFormSchemaTypes = z.infer<typeof signUpFormSchema>;
