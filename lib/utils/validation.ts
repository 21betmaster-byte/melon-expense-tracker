import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Must contain at least 1 number"),
});

export const expenseSchema = z
  .object({
    amount: z
      .number({ error: "Amount must be a number" })
      .refine((val) => val !== 0, { message: "Amount cannot be zero" })
      .refine((val) => Math.abs(val) <= 99_999_999, {
        message: "Amount cannot exceed ₹9,99,99,999",
      })
      .refine(
        (val) =>
          Number(val.toFixed(2)) === val ||
          (String(val).split(".")[1]?.length ?? 0) <= 2,
        { message: "Max 2 decimal places allowed" }
      ),
    description: z
      .string()
      .min(1, "Description is required")
      .max(100, "Max 100 characters")
      .transform((val) => val.trim()),
    group_id: z.string().min(1, "Group is required"),
    category_id: z.string().min(1, "Category is required"),
    expense_type: z.enum(["solo", "joint", "settlement"]),
    paid_by_user_id: z.string().min(1, "Payer is required"),
    split_ratio: z.number().min(0).max(1),
    date: z
      .date()
      .refine((d) => d <= new Date(), { message: "Date cannot be in the future" }),
    is_refund: z.boolean().optional(),
    is_recurring: z.boolean().optional(),
    recurring_frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  })
  .refine(
    (data) => {
      if (data.amount < 0 && !data.is_refund) return false;
      return true;
    },
    {
      message: "Negative amounts are only allowed for refunds",
      path: ["amount"],
    }
  );

export const groupNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(30, "Max 30 characters"),
});

export const categoryNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(30, "Max 30 characters"),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
export type ExpenseFormValues = z.infer<typeof expenseSchema>;
