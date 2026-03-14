import { NextResponse } from "next/server";
import { getStripe } from "../../../lib/stripe";
import content from "../../../data/content.json";
import { buildCartSizeSummary, getCartQuantity, normalizeCartItems } from "../../../lib/cart";

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

function buildReturnUrl(origin, returnPath, checkoutState) {
  const safeReturnPath = String(returnPath || "/").trim().startsWith("/") ? String(returnPath || "/").trim() : "/";
  const url = new URL(safeReturnPath || "/", origin);
  url.searchParams.set("checkout", checkoutState);
  return url.toString();
}

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY in Vercel." },
      { status: 500 }
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const slug = String(payload.slug || "product-001").trim().slice(0, 80);
  const returnPath = String(payload.returnPath || "/").trim();
  const origin = buildOrigin(request);
  const cartItems = normalizeCartItems(
    Array.isArray(payload.items)
      ? payload.items
      : {
          quantity: Number(payload.quantity) || 0,
          size: payload.size
        }
  );
  const productName = String(content.product.name || "The WOL Collective Product").replace(/^Product\s*\d+:\s*/i, "");
  const productDescription = String(content.product.description || "").trim().slice(0, 500);
  const currency = String(content.product.currency || "GBP").trim().toLowerCase();
  const unitAmount = Math.round(Number(content.product.price || 0) * 100);

  if (cartItems.length <= 0 || getCartQuantity(cartItems) <= 0) {
    return NextResponse.json({ error: "Add at least one size before checkout." }, { status: 400 });
  }

  if (!unitAmount || unitAmount < 1) {
    return NextResponse.json({ error: "Product pricing is not configured correctly." }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: buildReturnUrl(origin, returnPath, "success"),
      cancel_url: buildReturnUrl(origin, returnPath, "cancel"),
      allow_promotion_codes: true,
      line_items: cartItems.map(function (item) {
        return {
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: `${productName} - ${item.size}`,
              ...(productDescription ? { description: productDescription } : {})
            }
          },
          quantity: item.quantity
        };
      }),
      metadata: {
        product_slug: slug,
        size_breakdown: buildCartSizeSummary(cartItems)
      }
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe checkout session creation failed." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout session creation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
