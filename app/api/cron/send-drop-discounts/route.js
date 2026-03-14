import { NextResponse } from "next/server";
import { dispatchPendingDiscountEmails } from "../../../../lib/launch-discounts";

export const runtime = "nodejs";

function isAuthorized(request) {
  const adminSecret = process.env.DROP_ADMIN_SECRET || "";
  const authorization = request.headers.get("authorization") || "";
  const userAgent = request.headers.get("user-agent") || "";

  if (adminSecret && authorization === `Bearer ${adminSecret}`) {
    return true;
  }

  return userAgent.includes("vercel-cron/1.0");
}

function getDropGoLiveAt() {
  const value = String(process.env.DROP_GO_LIVE_AT || "").trim();
  if (!value) {
    return {
      value: "",
      valid: false,
      date: null
    };
  }

  const date = new Date(value);

  return {
    value,
    valid: Number.isFinite(date.getTime()),
    date
  };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dropGoLiveAt = getDropGoLiveAt();

  if (!dropGoLiveAt.value) {
    return NextResponse.json(
      { error: "DROP_GO_LIVE_AT is not configured." },
      { status: 500 }
    );
  }

  if (!dropGoLiveAt.valid || !dropGoLiveAt.date) {
    return NextResponse.json(
      { error: "DROP_GO_LIVE_AT is invalid. Use an ISO timestamp." },
      { status: 500 }
    );
  }

  const now = new Date();

  if (now < dropGoLiveAt.date) {
    return NextResponse.json({
      ok: true,
      status: "waiting",
      scheduledFor: dropGoLiveAt.value,
      now: now.toISOString()
    });
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 100);

  try {
    const result = await dispatchPendingDiscountEmails({
      limit: requestedLimit
    });

    return NextResponse.json({
      ok: true,
      status: "sent",
      scheduledFor: dropGoLiveAt.value,
      ...result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to dispatch launch discount emails.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
