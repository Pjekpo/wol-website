import { NextResponse } from "next/server";
import { dispatchPendingDiscountEmails } from "../../../../lib/launch-discounts";

export const runtime = "nodejs";

function isAuthorized(request) {
  const adminSecret = process.env.DROP_ADMIN_SECRET || "";
  if (!adminSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization") || "";
  return authorization === `Bearer ${adminSecret}`;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let limit = 100;

  try {
    const payload = await request.json();
    if (payload && payload.limit !== undefined) {
      limit = payload.limit;
    }
  } catch {
    limit = 100;
  }

  try {
    const result = await dispatchPendingDiscountEmails({ limit });
    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send launch discount emails.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
