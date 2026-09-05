# Share link scope is one-dimensional

Now that a transaction carries two independent dimensions (see ADR-0001), a share link's scope could in principle be expressed over Purposes, over Funding Sources, or over individual pairs. Decision: scope is expressed over Purposes **only**. A link's readers see every Funding Source of the shared Purposes, along with the self-paid / covered split.

The reason is reviewability: a one-dimensional permission model can be verified by reading it, whereas two intersecting dimensions generate combinations nobody enumerates — and that is where authorisation holes come from. This is a deliberate "no": do not add Funding Source **scoping** — a per-pot permission on a link — without re-reading this ADR first. (A per-pot *view filter* within a link's scope is a different thing; see the amendment below.)

## Consequences

- The `share_link_categories` junction becomes `share_link_purposes`, and each existing link's rows collapse to the distinct Purposes it already covered.
- The existing security property must survive unchanged: a viewer-supplied filter parameter is always **intersected** with the link's own scope before querying, so a hand-crafted URL cannot widen it (the `effectiveIds` computation in `src/server/public-report.queries.ts`).
- A link's readers **can** see how much of a cost was covered rather than self-paid. If that ever becomes a privacy problem, the fix is to hide the split at the presentation layer, not to add a second dimension to the permission model.

## Amendment (2026-09-05): a view filter is not scope

The public report now accepts a `fundingSource` **view filter** alongside `purpose`. This does not reopen the decision above, and the distinction is worth stating so it is not re-litigated:

- **Scope** is what a reader is *permitted* to see. It remains a set of Purposes, and a viewer-supplied `purpose` is still intersected with it.
- **A view filter** is what a reader *chooses to look at* within that scope. `fundingSource` only ever narrows rows the scope already allows. Readers were always shown every Funding Source of their Purposes, with the split, so letting them look at one pot at a time reveals nothing they could not already read off the page.

What stays forbidden is Funding Source as a *permission*: a link that grants "these Purposes, but only from this pot" is exactly the two-dimensional scope this ADR rejects, and the junction table stays `share_link_purposes` with no Funding Source column.
