import axios from "axios";

function getTimestamp(date = new Date()) {
  const eatNow = new Date(
    date.toLocaleString("en-US", { timeZone: "Africa/Nairobi" }),
  );
  const parts = [
    eatNow.getFullYear(),
    String(eatNow.getMonth() + 1).padStart(2, "0"),
    String(eatNow.getDate()).padStart(2, "0"),
    String(eatNow.getHours()).padStart(2, "0"),
    String(eatNow.getMinutes()).padStart(2, "0"),
    String(eatNow.getSeconds()).padStart(2, "0"),
  ];
  return parts.join("");
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("254")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `254${digits.slice(1)}`;
  }

  return digits;
}

async function getAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const env = process.env.MPESA_ENV === "production" ? "production" : "sandbox";

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const baseUrl =
    env === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  const response = await axios.get(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    },
  );

  return { token: response.data.access_token, baseUrl };
}

export function isMpesaConfigured() {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_URL,
  );
}

export async function initiateMpesaStkPush({
  phone,
  amount,
  accountReference,
  transactionDesc,
}) {
  const normalizedPhone = normalizePhone(phone);

  if (!isMpesaConfigured()) {
    return {
      ok: true,
      isMock: true,
      MerchantRequestID: `mock-${Date.now()}`,
      CheckoutRequestID: `mock-${Date.now()}`,
      CustomerMessage: "Mock STK Push accepted because M-PESA credentials are not configured.",
      phone: normalizedPhone,
      amount,
    };
  }

  const { token, baseUrl } = await getAccessToken();
  const timestamp = getTimestamp();
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`,
  ).toString("base64");

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(amount),
    PartyA: normalizedPhone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: normalizedPhone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  const response = await axios.post(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return {
    ok: response.data.ResponseCode === "0",
    isMock: false,
    ...response.data,
    phone: normalizedPhone,
    amount,
  };
}
