import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * v9 bundles nothing by default: a feature that is not registered here simply
 * has no API on the table, so this list is the table's capability surface.
 * Sorting is all the transaction table does — filtering happens in SQL, and the
 * rows are virtualized rather than paginated.
 *
 * `sortFns` is registered because `column.getAutoSortFn()` picks a name from
 * the first ten values and then looks that name up here, only `console.warn`ing
 * (in development) before falling back when it is missing. It can ask for
 * `text` or `alphanumeric` — today's category names resolve to `text`, but they
 * are user data, so both are registered. `datetime` is not: no column exposes a
 * `Date`. Numbers never reach this registry at all — the library returns its
 * own `sortFn_basic` directly, which is what the `amount` column sorts by.
 *
 * The type is exported because `ColumnDef` is now generic over the feature set
 * — a column can only use APIs the table actually registered.
 */
export const transactionTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
  },
});

export type TransactionTableFeatures = typeof transactionTableFeatures;
