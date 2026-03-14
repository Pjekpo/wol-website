import { NextResponse } from "next/server";
import {
  claimDiscountAndSendEmail,
  getMissingLaunchDiscountEnvVars,
  launchDiscountDispatchConfigured
} from "../../../lib/launch-discounts";

export const runtime = "nodejs";

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export async function POST(request) {
  if (!launchDiscountDispatchConfigured()) {
    const missingEnv = getMissingLaunchDiscountEnvVars();

    return NextResponse.json(
      {
        error: `Discount claims are not configured yet. Missing: ${missingEnv.join(", ")}`
      },
      { status: 500 }
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = String(payload.email || "").trim().toLowerCase();
  const source = String(payload.source || "scratchcard").trim().slice(0, 40);
  const reward = String(payload.reward || "10% off").trim().slice(0, 40);

  if (!validateEmail(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  try {
    const result = await claimDiscountAndSendEmail({
      email,
      source,
      reward
    });

    return NextResponse.json({
      ok: true,
      status: result.created ? "created" : "exists",
      emailed: result.emailed
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create and send discount claim.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
