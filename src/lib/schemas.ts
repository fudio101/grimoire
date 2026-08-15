import { z } from "zod";

/**
 * A `YYYY-MM` month key.
 *
 * Every month filter compares ISO date strings by prefix, so the *shape* of
 * this value is load-bearing rather than cosmetic. `nextMonthStart` parses it
 * with `Number`, and a non-numeric month yields the string "NaN-NaN-01" — which
 * sorts above every real ISO date, silently dropping the upper bound of the
 * range instead of erroring. A malformed lower bound is just as quiet: it
 * matches nothing and the page renders as empty.
 *
 * Rejecting the value at the boundary is what keeps those two failures from
 * looking like real answers.
 */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Tháng phải có dạng YYYY-MM");

/**
 * The `fromMonth` / `toMonth` pair, as a server function accepts it.
 *
 * Strict: a malformed month is rejected outright. Server functions are RPC
 * endpoints anyone can call directly, and there is no user to be gentle with.
 */
export const monthRangeSchema = z.object({
  fromMonth: monthSchema.optional(),
  toMonth: monthSchema.optional(),
});

/**
 * The same pair, as a *route* reads it out of the URL.
 *
 * Lenient: a malformed month falls back to "no bound" instead of throwing into
 * the error component. URLs get hand-edited, truncated by chat clients, and
 * shared long after the UI that produced them changed — answering a mangled
 * `?toMonth=` with a full-page error is worse than answering with an unfiltered
 * report, and `/p/$code` is read by people who cannot fix the link themselves.
 *
 * This is not a hole: `.catch` produces `undefined`, never the malformed
 * string, so nothing invalid reaches monthRangeSchema or the query layer.
 */
export const monthRangeSearchSchema = z.object({
  fromMonth: monthSchema.optional().catch(undefined),
  toMonth: monthSchema.optional().catch(undefined),
});

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

/**
 * TanStack Form matches a Standard Schema against its form data invariantly, so
 * a form's values must be typed as the schema's *input* rather than its output.
 * These differ wherever a field is optional.
 */
export type CategoryFormValues = z.input<typeof categorySchema>;

/**
 * A share-link code, as accepted on write.
 *
 * The floor is 8 rather than 3 because this code *is* the credential: anyone
 * holding it reads the report. A 3-character code is a ~250k keyspace, and
 * nothing here rate-limits guesses. Auto-generated codes are nanoid(12) over 36
 * characters, so only hand-picked ones were ever short.
 *
 * Read paths deliberately do not apply this floor — see SHARE_CODE_SHAPE — so
 * links shared before the floor existed keep working.
 */
export const SHARE_CODE_PATTERN = /^[a-zA-Z0-9-]{8,32}$/;

/**
 * The same alphabet with no length floor, for validating a code on the way in
 * from a URL. Its job is to reject shapes that could never be a code at all,
 * not to re-litigate the length of codes already handed out.
 */
export const SHARE_CODE_SHAPE = /^[a-zA-Z0-9-]{1,32}$/;

export const shareLinkSchema = z.object({
  name: z.string().max(100).optional(),
  code: z
    .string()
    .regex(
      SHARE_CODE_PATTERN,
      "Mã chỉ gồm a-z, A-Z, 0-9, dấu gạch ngang (8-32 ký tự)"
    )
    .optional()
    .or(z.literal("")),
  categoryIds: z.array(z.string()).min(1, "Chọn ít nhất 1 danh mục"),
});

export type ShareLinkInput = z.infer<typeof shareLinkSchema>;

export type ShareLinkFormValues = z.input<typeof shareLinkSchema>;

export const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * The `fromMonth`/`toMonth`/`category` triple, as the transactions server
 * function accepts it. Moved here (rather than left inline in
 * queries.functions.ts, where it originated) ahead of the Next.js migration:
 * a `"use server"` file may only export async functions, so this value export
 * would be a hard compile error there.
 */
export const transactionFilterSchema = monthRangeSchema.extend({
  category: z.string().optional(),
});

export type TransactionFilters = z.infer<typeof transactionFilterSchema>;

/** How many months the overview trend covers, including the selected one. */
export const overviewSchema = z.object({
  month: monthSchema,
});

/**
 * A public share-link code, as accepted on read via `/p/$code`. Moved here for
 * the same reason as `transactionFilterSchema` above.
 */
export const publicReportSchema = monthRangeSchema.extend({
  // SHARE_CODE_SHAPE, not SHARE_CODE_PATTERN: this rejects values that could
  // never be a code, without imposing the 8-character write floor on links that
  // were handed out before that floor existed.
  code: z.string().regex(SHARE_CODE_SHAPE),
  category: z.string().optional(),
});

export type PublicReportSearch = Omit<
  z.infer<typeof publicReportSchema>,
  "code"
>;
