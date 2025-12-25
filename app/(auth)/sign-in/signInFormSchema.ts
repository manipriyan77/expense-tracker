import { z } from "zod";

export const singInFormSchema = z.object({
  email: z.string().email("Invalid Email Address"),
  password: z.string(),
});

export type SignInFormSchemaTypes = z.infer<typeof singInFormSchema>;
