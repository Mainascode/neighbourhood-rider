import { getUserFromRequest } from "../../../../lib/api-auth.js";
import { fail, ok } from "../../../../lib/response.js";

export async function GET() {
  const user = await getUserFromRequest();

  if (!user) {
    return fail("Unauthorized.", 401);
  }

  return ok({ user });
}
