import { getPublicReport } from "@/server/public-report.queries";
import { publicReportSchema } from "@/lib/schemas";

/**
 * Deliberately unauthenticated, like `login` — this is a public share link's
 * own data, gated by the code itself rather than a session. No origin check
 * either: nothing here depends on a cookie a cross-site request could ride
 * along, so there is nothing for that check to protect.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = publicReportSchema.safeParse({
    code: searchParams.get("code") ?? "",
    fromMonth: searchParams.get("fromMonth") ?? undefined,
    toMonth: searchParams.get("toMonth") ?? undefined,
    purpose: searchParams.get("purpose") ?? undefined,
    fundingSource: searchParams.get("fundingSource") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  }

  const { code, ...search } = parsed.data;
  const report = await getPublicReport({ ...search, code });
  if (!report) {
    return Response.json({ error: "Không tìm thấy báo cáo." }, { status: 404 });
  }
  return Response.json(report);
}
