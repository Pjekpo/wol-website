import { NextResponse } from "next/server";

export const runtime = "nodejs";

function buildOrigin(request) {
  const headerOrigin = request.headers.get("origin");
  if (headerOrigin) {
    return headerOrigin;
  }

  const host = request.headers.get("host");
  if (host) {
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

export async function POST(request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID;

  if (!stripeSecretKey || !stripePriceId) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel." },
      { status: 500 }
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const quantity = Math.max(1, Math.min(10, Number(payload.quantity) || 1));
  const size = String(payload.size || "").trim().slice(0, 20);
  const slug = String(payload.slug || "product-001").trim().slice(0, 80);
  const origin = buildOrigin(request);

  if (!size) {
    return NextResponse.json({ error: "Select a size before checkout." }, { status: 400 });
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${origin}/?checkout=success`);
  params.set("cancel_url", `${origin}/?checkout=cancel`);
  params.set("allow_promotion_codes", "true");
  params.set("line_items[0][price]", stripePriceId);
  params.set("line_items[0][quantity]", String(quantity));
  params.set("metadata[size]", size);
  params.set("metadata[product_slug]", slug);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString(),
    cache: "no-store"
  });

  const data = await response.json();

  if (!response.ok || !data.url) {
    const message = data?.error?.message || "Stripe checkout session creation failed.";
    return NextResponse.json({ error: message }, { status: response.status || 500 });
  }

  return NextResponse.json({ url: data.url });
}
