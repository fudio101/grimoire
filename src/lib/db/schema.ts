import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

export const categories = sqliteTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text("name").notNull(),
  parentId: text("parent_id").references((): AnySQLiteColumn => categories.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const shareLinks = sqliteTable("share_links", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  code: text("code").notNull().unique(), // custom slug or nanoid(12)
  name: text("name"), // optional label
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const shareLinkCategories = sqliteTable(
  "share_link_categories",
  {
    shareLinkId: text("share_link_id")
      .notNull()
      .references(() => shareLinks.id),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
  },
  (t) => [primaryKey({ columns: [t.shareLinkId, t.categoryId] })]
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    amount: real("amount").notNull(),
    note: text("note").notNull().default(""),
    date: text("date").notNull(), // ISO datetime string YYYY-MM-DDTHH:mm
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  /**
   * SQLite does not index foreign-key columns on its own, so without these
   * every read of this table is a full scan — including the two guards that run
   * on each category write (the delete check and parentCanAdoptChildren).
   *
   * `(category_id, date)` is composite and in that order because the filtered
   * list query constrains the category first and then narrows by month; leading
   * with `date` would leave the category predicate to a scan of the range. The
   * standalone `(date)` index serves the queries with no category at all — the
   * unfiltered list and the monthly rollups — which the composite cannot help,
   * since its leading column is absent from them.
   */
  (t) => [
    index("transactions_category_id_date_idx").on(t.categoryId, t.date),
    index("transactions_date_idx").on(t.date),
  ]
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type ShareLink = typeof shareLinks.$inferSelect;
export type NewShareLink = typeof shareLinks.$inferInsert;
