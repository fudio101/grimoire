import { guardApiRequest } from "@/server/http-auth";
import { getRecentPurposes } from "@/lib/db/queries";

/** Quick-pick chips for the transaction form. Private data — guarded like every other read here. */
export async function GET(request: Request) {
  const denied = await guardApiRequest(request);
  if (denied) return denied;

  return Response.json(await getRecentPurposes());
}
