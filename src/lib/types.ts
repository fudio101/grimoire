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
};
