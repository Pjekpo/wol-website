import { NextResponse } from "next/server";
import { getStripe } from "../../../lib/stripe";
import content from "../../../data/content.json";
import { buildCartSizeSummary, getCartQuantity, normalizeCartItems } from "../../../lib/cart";

export const runtime = "nodejs";

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
      ui_mode: "embedded",
      redirect_on_completion: "never",
      payment_method_types: ["card"],
      mode: "payment",
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

    if (!session.client_secret) {
      return NextResponse.json({ error: "Stripe embedded checkout session creation failed." }, { status: 500 });
    }

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe embedded checkout session creation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
