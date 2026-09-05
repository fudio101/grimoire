import type { z } from "zod";

/**
 * Every user-facing word that differs between the two dimensions, in one place.
 *
 * The management screens, the form and the list are shared components — the
 * mechanism is identical — so this is what keeps a Purpose screen from ever
 * saying "nguồn tiền" and vice versa. ADR-0001's whole point is that the two
 * must not be confusable; sharing the code and separating the words is how
 * that survives someone editing one of them later.
 *
 * `queryKey` is the bare cache key for this dimension's own list, matching
 * `query-options.ts`.
 */
export type DimensionCopy = {
  queryKey: "purposes" | "fundingSources";
  /** Plural, for headings and counts. */
  plural: string;
  nameLabel: string;
  namePlaceholder: string;
  createLabel: string;
  editTitle: string;
  deleteTitle: string;
  deleteConfirm: (name: string) => string;
  emptyTitle: string;
  emptyDescription: string;
};

export const PURPOSE_COPY: DimensionCopy = {
  queryKey: "purposes",
  plural: "Mục đích chi",
  nameLabel: "Tên mục đích chi",
  namePlaceholder: "Tiền dùng để làm gì?",
  createLabel: "Thêm mục đích chi",
  editTitle: "Sửa mục đích chi",
  deleteTitle: "Xoá mục đích chi",
  deleteConfirm: (name) => `Bạn có chắc chắn muốn xoá mục đích chi "${name}"?`,
  emptyTitle: "Chưa có mục đích chi",
  emptyDescription: "Tạo mục đích chi đầu tiên để bắt đầu ghi chi tiêu.",
};

export const FUNDING_SOURCE_COPY: DimensionCopy = {
  queryKey: "fundingSources",
  plural: "Nguồn tiền",
  nameLabel: "Tên nguồn tiền",
  namePlaceholder: "Tiền lấy từ đâu?",
  createLabel: "Thêm nguồn tiền",
  editTitle: "Sửa nguồn tiền",
  deleteTitle: "Xoá nguồn tiền",
  deleteConfirm: (name) => `Bạn có chắc chắn muốn xoá nguồn tiền "${name}"?`,
  emptyTitle: "Chưa có nguồn tiền",
  emptyDescription: "Tạo nguồn tiền đầu tiên để bắt đầu ghi chi tiêu.",
};

/**
 * The shape both dimensions' schemas share — a single required name.
 *
 * Typed against zod rather than `@standard-schema/spec` so this pulls in no
 * new dependency for one type: zod is already here, TanStack Form accepts a
 * zod schema as a Standard Schema, and `purposeSchema` / `fundingSourceSchema`
 * both match this exactly.
 */
export type DimensionSchema = z.ZodObject<{ name: z.ZodString }>;
