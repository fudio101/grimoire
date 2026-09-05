import { guardApiRequest } from "@/server/http-auth";
import { getPurposes } from "@/lib/db/queries";

export async function GET(request: Request) {
  const denied = await guardApiRequest(request);
  if (denied) return denied;

  return Response.json(await getPurposes());
}
