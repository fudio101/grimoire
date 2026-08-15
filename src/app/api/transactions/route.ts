import { guardApiRequest } from "@/server/http-auth";
import { getTransactions } from "@/lib/db/queries";
import { transactionFilterSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const denied = await guardApiRequest(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const parsed = transactionFilterSchema.safeParse({
    fromMonth: searchParams.get("fromMonth") ?? undefined,
    toMonth: searchParams.get("toMonth") ?? undefined,
    category: searchParams.get("category") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: "Tham số không hợp lệ." }, { status: 400 });
  }

  return Response.json(
    await getTransactions({
      fromMonth: parsed.data.fromMonth,
      toMonth: parsed.data.toMonth,
      categoryId: parsed.data.category,
    })
  );
}
