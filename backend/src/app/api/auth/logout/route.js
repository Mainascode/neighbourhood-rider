import { clearSessionCookie } from "../../../../lib/auth.js";
import { ok } from "../../../../lib/response.js";

export async function POST() {
  await clearSessionCookie();
  return ok({ message: "Logged out." });
}
