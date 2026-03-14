import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isAuthorized(request) {
  const adminSecret = process.env.DROP_ADMIN_SECRET || "";
  if (!adminSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization") || "";
  return authorization === `Bearer ${adminSecret}`;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY || "";
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || "";

  if (!resendApiKey || !resendFromEmail) {
    return NextResponse.json(
      { error: "Resend is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL." },
      { status: 500 }
    );
  }

  let payload = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const email = String(payload.email || "thewolcollective@gmail.com").trim().toLowerCase();

  if (!validateEmail(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [email],
      subject: "The WOL Collective email test",
      html: `
        <div style="background:#0a0a0a;color:#f6f2e8;padding:32px;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0 0 12px;color:#bda98e;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;">The WOL Collective</p>
          <h1 style="margin:0 0 16px;font-size:28px;line-height:1;">Resend is connected.</h1>
          <p style="margin:0;color:#d7d0c5;line-height:1.7;">
            This is a test email from your storefront setup. Your email pipeline is ready for launch discounts.
          </p>
        </div>
      `.trim()
    }),
    cache: "no-store"
  });

  const resendPayload = await response.json();

  if (!response.ok || !resendPayload.id) {
    return NextResponse.json(
      { error: resendPayload?.message || resendPayload?.error || "Failed to send test email." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: resendPayload.id,
    email
  });
}
