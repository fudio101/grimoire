import {
  sqliteTable,
  text,
  integer,
  real,
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
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  shareToken: text("share_token").unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const transactions = sqliteTable("transactions", {
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
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
