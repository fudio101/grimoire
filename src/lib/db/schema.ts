import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

/**
 * The two dimensions of a transaction, as flat and independent tables (ADR-0001).
 *
 * Neither carries a parent column: the hierarchy is what conflated the two
 * dimensions in the first place. Re-introducing nesting on either side later is
 * a single `ALTER TABLE ADD COLUMN`, exactly as the original one was added.
 *
 * Names are deliberately *not* uniquely indexed, and the reason differs per
 * table. `purposes` comes out of the migration already distinct by
 * construction, since it merges the old leaves by name — an index there would
 * enforce nothing that is not already true. `funding_sources` copies every
 * former root verbatim with no dedupe, so it genuinely *could* carry two rows
 * with one name; indexing it would hand this migration a way to fail on real
 * data, which is the one thing it must not do.
 *
 * Either way the cost is the same: a unique index turns a user-facing "that
 * name is taken" into a raw SQLite constraint throw inside the actions. If
 * uniqueness is wanted later it belongs there, as a checked rule with a
 * message, not here.
 */

/** What the money was used for. */
export const purposes = sqliteTable("purposes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** The pot the money was drawn from. */
export const fundingSources = sqliteTable("funding_sources", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text("name").notNull(),
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

/**
 * A share link's scope, expressed over Purposes only (ADR-0002). Readers of a
 * link see every Funding Source of the shared Purposes; the permission model
 * stays one-dimensional so it can be verified by reading it.
 */
export const shareLinkPurposes = sqliteTable(
  "share_link_purposes",
  {
    shareLinkId: text("share_link_id")
      .notNull()
      .references(() => shareLinks.id),
    purposeId: text("purpose_id")
      .notNull()
      .references(() => purposes.id),
  },
  (t) => [primaryKey({ columns: [t.shareLinkId, t.purposeId] })]
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
    purposeId: text("purpose_id")
      .notNull()
      .references(() => purposes.id),
    fundingSourceId: text("funding_source_id")
      .notNull()
      .references(() => fundingSources.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  /**
   * SQLite does not index foreign-key columns on its own, so without these
   * every read of this table is a full scan — including the guards that run on
   * each Purpose and Funding Source delete.
   *
   * `(purpose_id, date)` is composite and in that order because the filtered
   * list query constrains the Purpose first and then narrows by month; leading
   * with `date` would leave the Purpose predicate to a scan of the range. The
   * standalone `(date)` index serves the queries with no Purpose at all — the
   * unfiltered list and the monthly rollups — which the composite cannot help,
   * since its leading column is absent from them.
   *
   * The funding dimension gets no index of its own: it is the smaller of the
   * two by design (a handful of pots), so a filter on it alone is not selective
   * enough to be worth an index until the row count says otherwise.
   */
  (t) => [
    index("transactions_purpose_id_date_idx").on(t.purposeId, t.date),
    index("transactions_date_idx").on(t.date),
  ]
);

export type Purpose = typeof purposes.$inferSelect;
export type FundingSource = typeof fundingSources.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
