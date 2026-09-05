# Two dimensions instead of a category tree

The self-referential category tree (`categories.parent_id`, one-to-many) was being used to encode **two orthogonal dimensions**: the root level was really the Funding Source and the leaf level was really the Purpose. Because the same Purposes recur under every Funding Source, sibling branches ended up carrying children with identical names, which reads to a user as a distinction without a difference.

Three failures followed. A total per Purpose could not be computed at all, because the filter accepts a single category id (a repeated filter parameter is narrowed to the first value on purpose, so the server and client derive the same query key) and the matching leaves live in different branches. Answering the same question by hand took two passes and mental arithmetic. And the overview chart rolled up by root category, so it reported which pot the money came from and never what it was spent on.

Decision: drop the parent-child relationship entirely, split the two dimensions into two independent tables, and give `transactions` two foreign keys — one to the Purpose, one to the Funding Source.

## Considered Options

- **A many-to-many parent-child relationship** (one leaf, several parents) — rejected because a transaction references a single node, so merging the leaves would **destroy each transaction's Funding Source**. On top of that, `getRootCategory` returns exactly one root and `getDescendantIds` carries no visited set, so a DAG would double-count in the overview roll-up and corrupt the tri-state arithmetic in the share-link category tree.
- **A pair table with its own id, referenced by `transactions`** — equivalent in expressive power, and cheap to migrate since each existing leaf already corresponds to one pair. Rejected because a pair table only earns its keep when there are illegal combinations to forbid, because it forces an extra join onto every read path, and because holding both dimensions in one `categories` table leaves the model unable to say which side is a Funding Source and which is a Purpose.
- **A generic facet model** (`facets` / `facet_values` / a junction to transactions) — rejected as premature generalisation: the problem is known to have exactly two dimensions, and the "exactly one value per facet" rule would have to be enforced in application code because the schema cannot express it.

## Consequences

- The "transactions may only attach to a leaf" rule (`categoryIsLeaf`) disappears — every Purpose is attachable.
- `src/lib/category-tree.ts` and the drill-down / tri-state UI built on top of it no longer have a reason to exist in their current form.
- Immediately after the migration the Purpose dimension is coarse, because merging the old leaves preserves exactly the distinctions the tree already made and no more. Breaking the broadest Purpose into finer ones is a later piece of work needing the admin's judgement, and is not part of this decision.
- The term "category" is **dropped**, not renamed. The `categories` table is not `ALTER`ed into `purposes`; the migration creates `purposes` and `funding_sources`, copies the data across, rebuilds `transactions`, then drops `categories`. Because `transactions` has to be rebuilt anyway (SQLite requires a table rebuild to change a foreign key) and the duplicate leaves have to merge under a fresh id, this is a **replacement** rather than a rename — so there is never a window in which `purpose` and `category` coexist.
- Routes and URL parameters follow (`/dashboard/manage/purposes`, `/api/purposes`, `?purpose=`), with **no** redirects from the old paths. Existing bookmarks break; for a single-user application that costs less than letting the word `category` survive forever inside a redirect layer.
- The remaining `categor*` occurrences in `drizzle/*.sql` and `drizzle/meta/*_snapshot.json` are frozen migration history and **must not be edited**.
