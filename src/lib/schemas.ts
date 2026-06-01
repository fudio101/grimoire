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

export const shareLinkSchema = z.object({
  name: z.string().max(100).optional(),
  code: z
    .string()
    .regex(
      /^[a-z0-9-]{3,32}$/,
      "Mã chỉ gồm a-z, 0-9, dấu gạch ngang (3-32 ký tự)"
    )
    .optional()
    .or(z.literal("")),
  categoryIds: z.array(z.string()).min(1, "Chọn ít nhất 1 danh mục"),
});

export type ShareLinkInput = z.infer<typeof shareLinkSchema>;

export const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginInput = z.infer<typeof loginSchema>;
