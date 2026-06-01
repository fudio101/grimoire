import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  note: z.string().max(500),
  date: z.string().min(1, "Vui lòng chọn thời gian"),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên danh mục").max(100),
  parentId: z.string().nullable().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginInput = z.infer<typeof loginSchema>;
