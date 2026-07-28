export type ActionState = {
  success: boolean;
  error?: string;
};

export type TransactionRow = {
  id: string;
  amount: number;
  note: string;
  date: string;
  categoryId: string;
  categoryName: string | null;
  /** Tie-break for the default ordering; queries already select it. */
  createdAt: string;
};

/**
 * What the shared table renders. `categoryPathParts` is resolved by whoever
 * owns the category data: the dashboard walks its own category list, while
 * /p/$code receives it precomputed so the tree never reaches the client.
 */
export type TransactionTableRow = TransactionRow & {
  categoryPathParts: string[];
};
