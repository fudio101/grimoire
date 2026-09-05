import type { z } from "zod";

/**
 * Every user-facing word that differs between the two dimensions, in one place.
 *
 * The management screens, the form, the filters and the list are shared
 * components — the mechanism is identical — so this is what keeps a Purpose
 * screen from ever saying "nguồn tiền" and vice versa. ADR-0001's whole point
 * is that the two must not be confusable; sharing the code and separating the
 * words is how that survives someone editing one of them later. A word that is
 * the *same* for both (the filters' "Tất cả") does not belong here and lives
 * with the component that renders it.
 *
 * `queryKey` is the bare cache key for this dimension's own list, matching
 * `query-options.ts`; `invalidates` is every *other* key a write to this
 * dimension makes stale, spelled out rather than inferred.
 */
export type DimensionCopy = {
  queryKey: "purposes" | "fundingSources";
  /** Bare cache keys a create, rename or delete here invalidates. */
  invalidates: readonly string[];
  /** Plural, for headings and counts. */
  plural: string;
  /**
   * The prompt wherever the user is *choosing* one of these — the filter rows
   * and the transaction form — and, word for word, the placeholder when
   * *naming* one on the management screen (`namePlaceholder`): "what is the
   * money for?" is the right hint for both. A question, not a noun: the person
   * this app is for parses it faster than "Purpose", and the screen should say
   * what to do rather than name an abstraction. Headings and table columns
   * keep the short noun (`plural`), because there the word labels a thing
   * rather than asks for a decision.
   */
  question: string;
  /**
   * The chip shown when a filter names something that no longer exists — an
   * id left in a URL after the thing was renamed or deleted. Distinct from
   * `everything` on purpose: without it, a filter matching zero rows would
   * read exactly like no filter at all.
   */
  unknown: string;
  nameLabel: string;
  namePlaceholder: string;
  createLabel: string;
  editTitle: string;
  deleteTitle: string;
  deleteConfirm: (name: string) => string;
  emptyTitle: string;
  emptyDescription: string;
};

const PURPOSE_QUESTION = "Tiền dùng để làm gì?";
const FUNDING_SOURCE_QUESTION = "Tiền lấy từ đâu?";

export const PURPOSE_COPY: DimensionCopy = {
  queryKey: "purposes",
  /**
   * `shareLinks` is here because a link's scope is a list of Purposes: the
   * links screen renders their names, and deleting one detaches it from every
   * link that named it. Without this the management screen keeps showing a
   * Purpose that no longer exists, or the name it used to have.
   */
  invalidates: ["transactions", "overview", "shareLinks"],
  plural: "Mục đích chi",
  question: PURPOSE_QUESTION,
  unknown: "Mục đích chi không còn tồn tại",
  nameLabel: "Tên mục đích chi",
  namePlaceholder: PURPOSE_QUESTION,
  createLabel: "Thêm mục đích chi",
  editTitle: "Sửa mục đích chi",
  deleteTitle: "Xoá mục đích chi",
  deleteConfirm: (name) => `Bạn có chắc chắn muốn xoá mục đích chi "${name}"?`,
  emptyTitle: "Chưa có mục đích chi",
  emptyDescription: "Tạo mục đích chi đầu tiên để bắt đầu ghi chi tiêu.",
};

export const FUNDING_SOURCE_COPY: DimensionCopy = {
  queryKey: "fundingSources",
  // No `shareLinks`: a link's scope is one-dimensional (ADR-0002), so nothing
  // about a Funding Source can change what a link shows in that list.
  invalidates: ["transactions", "overview"],
  plural: "Nguồn tiền",
  question: FUNDING_SOURCE_QUESTION,
  unknown: "Nguồn tiền không còn tồn tại",
  nameLabel: "Tên nguồn tiền",
  namePlaceholder: FUNDING_SOURCE_QUESTION,
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
