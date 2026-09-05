# Share link scope is one-dimensional

Now that a transaction carries two independent dimensions (see ADR-0001), a share link's scope could in principle be expressed over Purposes, over Funding Sources, or over individual pairs. Decision: scope is expressed over Purposes **only**. A link's readers see every Funding Source of the shared Purposes, along with the self-paid / covered split.

The reason is reviewability: a one-dimensional permission model can be verified by reading it, whereas two intersecting dimensions generate combinations nobody enumerates — and that is where authorisation holes come from. This is a deliberate "no": do not add Funding Source filtering to share links without re-reading this ADR first.

## Consequences

- The `share_link_categories` junction becomes `share_link_purposes`, and each existing link's rows collapse to the distinct Purposes it already covered.
- The existing security property must survive unchanged: a viewer-supplied filter parameter is always **intersected** with the link's own scope before querying, so a hand-crafted URL cannot widen it (today this lives in `src/server/public-report.queries.ts:44-51`).
- A link's readers **can** see how much of a cost was covered rather than self-paid. If that ever becomes a privacy problem, the fix is to hide the split at the presentation layer, not to add a second dimension to the permission model.
