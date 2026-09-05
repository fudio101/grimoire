import { guardApiRequest } from "@/server/http-auth";
import { getFundingSources } from "@/lib/db/queries";

/** The second dimension, on its own route — the two are independent. */
export async function GET(request: Request) {
  const denied = await guardApiRequest(request);
  if (denied) return denied;

  return Response.json(await getFundingSources());
}
