import connectDB from "../../../../lib/db.js";
import User from "../../../../models/User.js";
import { hashPassword, serializeUser, setSessionCookie } from "../../../../lib/auth.js";
import { SERVICE_AREAS } from "../../../../lib/constants.js";
import { fail, ok } from "../../../../lib/response.js";

function createReferralCode(name) {
  return `${String(name || "RIDER").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4)}${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function POST(request) {
  const body = await request.json();
  const { name, email, phone, password, location, referralCode } = body;

  if (!name || !email || !phone || !password) {
    return fail("Name, email, phone, and password are required.");
  }

  if (!SERVICE_AREAS.includes(location)) {
    return fail("Service area must be Ruaka - Gathigi Estate.");
  }

  await connectDB();
  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return fail("Email already registered.", 409);
  }

  let referrer = null;
  if (referralCode) {
    referrer = await User.findOne({ referralCode: String(referralCode).trim().toUpperCase() });
    if (!referrer) {
      return fail("Referral code not found.");
    }
  }

  const role = normalizedEmail === String(process.env.ADMIN_EMAIL || "").toLowerCase() ? "admin" : "user";

  let generatedCode = createReferralCode(name);
  while (await User.findOne({ referralCode: generatedCode })) {
    generatedCode = createReferralCode(`${name}${Date.now()}`);
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    phone,
    password: await hashPassword(password),
    location,
    role,
    referralCode: generatedCode,
    referredBy: referrer?._id || null,
  });

  await setSessionCookie(user);
  return ok({ user: serializeUser(user), message: "Account created." }, { status: 201 });
}
