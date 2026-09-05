# Grimoire

A self-hosted personal expense tracker used by a single admin, with a Vietnamese UI and VND amounts. This context describes the shared language of recording and rolling up spending.

> This glossary names concepts, never the admin's own data. The concrete Purposes and Funding Sources live in the database; do not enumerate them here, in ADRs, in issues, or in tests — this repository is public.

## Language

### The two dimensions of a transaction

Every **Transaction** is described by two **independent** dimensions: what the money was used for (**Purpose**) and which pot it came out of (**Funding Source**). The two are orthogonal — knowing one tells you nothing about the other.

**Transaction**:
An amount of money spent at a point in time, always stored as a positive number. Every Transaction is an outflow — this context has no concept of income, not even for entries whose note reads like money coming back in.
_Avoid_: Expense record, entry, khoản chi

**Purpose** (UI: _Mục đích chi_):
What the money was used for. Answers "what was it spent on?". A flat set with no hierarchy.
_Avoid_: Category, danh mục, loại chi

**Funding Source** (UI: _Nguồn tiền_):
The pot the money was drawn from. Answers "where did the money come from?". A flat set, independent of Purpose.
_Avoid_: Parent category, danh mục cha, group

### How totals are rolled up

**Gross cost**:
The total spent on a Purpose, summed across every Funding Source. This is the default figure shown for a Purpose.
_Avoid_: Total, net

**Self-paid share**:
The part of a Gross cost drawn from Funding Sources the admin paid out of their own pocket.
_Avoid_: Net spend, real cost, out-of-pocket

**Covered share**:
The part of a Gross cost drawn from Funding Sources supplied by someone else — a reimbursement or a gift.
_Avoid_: Reimbursed portion, discount
