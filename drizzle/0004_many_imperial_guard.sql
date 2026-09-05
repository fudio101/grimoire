-- Replace the category tree with the two independent dimensions (ADR-0001).
--
-- Structure and data move together, in one migration, because they cannot be
-- separated: `transactions` has to be rebuilt to change its foreign keys, and
-- the rows it carries have to be re-pointed at the new tables in the same
-- breath. This is a replacement, not a rename — `categories` is never ALTERed
-- into `purposes`, so no window exists in which both vocabularies are live.
--
-- The mapping:
--   * every ROOT category becomes a Funding Source, keeping its existing id —
--     the concept is unchanged, so its identity should be too;
--   * every LEAF name becomes one Purpose with a FRESHLY minted UUIDv7 id.
--     Leaves sharing a name across branches merge into a single Purpose, and
--     the new id says so: an old id would silently start meaning "this purpose,
--     from every pot" and an old bookmark would widen without saying so;
--   * a transaction keeps its amount, note, date and id, and gains the Purpose
--     matching its old category's name plus the Funding Source that is its old
--     category's root ancestor;
--   * a share link's scope collapses to the distinct Purposes it already
--     covered through the subtree it pointed at (ADR-0002).
--
-- That last one can WIDEN what a link shows, and does so by design. Scope is
-- one-dimensional now, so a link that pointed at one branch's leaf sees that
-- Purpose funded from every pot — ADR-0002 states this outright ("A link's
-- readers see every Funding Source of the shared Purposes"). Where two
-- branches held a same-named leaf, that is precisely the merge this whole
-- change exists to perform, and the link inherits it. It is a deliberate
-- consequence on the one unauthenticated surface in the app, so if it ever
-- stops being acceptable the fix is at the presentation layer, not a second
-- dimension in the permission model — re-read ADR-0002 before changing it.
--
-- Deferred rather than disabled foreign keys: drizzle's migrator wraps every
-- migration in BEGIN/COMMIT, and `PRAGMA foreign_keys` is documented as a
-- no-op inside a transaction — so the OFF/ON pair drizzle-kit generates for a
-- table rebuild would silently do nothing here. `defer_foreign_keys` does work
-- inside a transaction, and is what lets `DROP TABLE categories` delete a
-- self-referencing table without tripping its own parent_id constraint
-- part-way through. It defers foreign keys only: the NOT NULL columns below
-- still fail immediately, which is the point — see the LEFT JOINs.
PRAGMA defer_foreign_keys = ON;--> statement-breakpoint
CREATE TABLE `funding_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purposes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `share_link_purposes` (
	`share_link_id` text NOT NULL,
	`purpose_id` text NOT NULL,
	PRIMARY KEY(`share_link_id`, `purpose_id`),
	FOREIGN KEY (`share_link_id`) REFERENCES `share_links`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purpose_id`) REFERENCES `purposes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Former roots keep their identity.
INSERT INTO `funding_sources` ("id", "name", "created_at")
SELECT "id", "name", "created_at" FROM `categories` WHERE `parent_id` IS NULL;
--> statement-breakpoint
-- One Purpose per distinct leaf name, under a fresh UUIDv7.
--
-- SQLite has no uuid function, so the id is assembled by hand from the layout
-- UUIDv7 specifies: 48 bits of Unix milliseconds, the version nibble `7`, two
-- bits of variant (which is what restricts the 17th hex digit to 8/9/a/b), and
-- random bits for the rest. `randomblob` and `random` are non-deterministic, so
-- they are evaluated once per group — one distinct id per Purpose.
--
-- The source set is "categories that are leaves BELOW a root, OR that hold
-- transactions at all".
--
-- The first half is the ordinary case. The second exists so the transactions
-- INSERT further down can never find itself with no Purpose to point at: it
-- covers a childless root that was spent from directly (legal under the old
-- leaf-only rule, since such a root is its own leaf) and any row that predates
-- that rule. What it deliberately does NOT cover is a childless root with no
-- transactions — a pot created and not yet spent from. That is a Funding
-- Source and nothing else; minting a Purpose for it too would invent a
-- spending purpose the admin never recorded.
INSERT INTO `purposes` ("id", "name", "created_at")
SELECT
	substr(ts, 1, 8) || '-' || substr(ts, 9, 4)
		|| '-7' || substr(rnd, 1, 3)
		|| '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(rnd, 4, 3)
		|| '-' || substr(rnd, 7, 12),
	name,
	created_at
FROM (
	SELECT
		printf('%012x', CAST((julianday('now') - 2440587.5) * 86400000.0 AS INTEGER)) AS ts,
		lower(hex(randomblob(9))) AS rnd,
		c.name AS name,
		min(c.created_at) AS created_at
	FROM `categories` c
	WHERE (
			c.parent_id IS NOT NULL
			AND NOT EXISTS (SELECT 1 FROM `categories` x WHERE x.parent_id = c.id)
		)
		OR EXISTS (SELECT 1 FROM `transactions` t WHERE t.category_id = c.id)
	GROUP BY c.name
);
--> statement-breakpoint
-- A link pointing at a branch could see every leaf beneath it, so its scope
-- becomes the Purposes of that whole subtree. Because leaves merge by name,
-- this can hand the link a Purpose that is also funded from a pot the link
-- never pointed at — see the note in the header; ADR-0002 decided it.
INSERT INTO `share_link_purposes` ("share_link_id", "purpose_id")
WITH RECURSIVE covered(share_link_id, category_id) AS (
	SELECT share_link_id, category_id FROM `share_link_categories`
	UNION
	SELECT v.share_link_id, c.id
	FROM `categories` c JOIN covered v ON c.parent_id = v.category_id
)
SELECT DISTINCT v.share_link_id, p.id
FROM covered v
JOIN `categories` c ON c.id = v.category_id
JOIN `purposes` p ON p.name = c.name
WHERE (
		c.parent_id IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM `categories` x WHERE x.parent_id = c.id)
	)
	OR EXISTS (SELECT 1 FROM `transactions` t WHERE t.category_id = c.id);
--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`date` text NOT NULL,
	`purpose_id` text NOT NULL,
	`funding_source_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`purpose_id`) REFERENCES `purposes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`funding_source_id`) REFERENCES `funding_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- LEFT JOIN, deliberately, on all three: every source row produces exactly one
-- output row, so a transaction that cannot be mapped arrives as a NULL against
-- a NOT NULL column and takes the whole migration down with it. An INNER JOIN
-- would drop that row instead, and a migration that silently loses money is
-- indistinguishable from one that worked.
WITH RECURSIVE ancestry(id, root_id) AS (
	SELECT id, id FROM `categories` WHERE parent_id IS NULL
	UNION
	SELECT c.id, a.root_id FROM `categories` c JOIN ancestry a ON c.parent_id = a.id
)
INSERT INTO `__new_transactions` ("id", "amount", "note", "date", "purpose_id", "funding_source_id", "created_at")
SELECT t.id, t.amount, t.note, t.date, p.id, a.root_id, t.created_at
FROM `transactions` t
LEFT JOIN `categories` c ON c.id = t.category_id
LEFT JOIN `purposes` p ON p.name = c.name
LEFT JOIN ancestry a ON a.id = c.id;
--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
CREATE INDEX `transactions_purpose_id_date_idx` ON `transactions` (`purpose_id`,`date`);--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);--> statement-breakpoint
DROP TABLE `share_link_categories`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
-- Confined to this migration. Drizzle wraps *every* pending migration in one
-- BEGIN/COMMIT, and `defer_foreign_keys` only resets at transaction end — so
-- without this a later migration running in the same batch (a fresh database
-- applies 0000-0004 together) would silently inherit deferred foreign keys it
-- never asked for, turning a violation that should fail at its own statement
-- into a bare "FOREIGN KEY constraint failed" at COMMIT naming nothing.
PRAGMA defer_foreign_keys = OFF;
