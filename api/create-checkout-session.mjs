const STRIPE_API_URL = "https://api.stripe.com/v1/checkout/sessions";

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export async function POST(request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!secretKey || !priceId) {
    return json(
      {
        error: "Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID in Vercel environment variables."
      },
      500
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: "Invalid request body." }, 400);
  }

  const quantity = Math.max(1, Math.min(10, Number(body.quantity || 1)));
  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const form = new URLSearchParams();

  form.set("mode", "payment");
  form.set("success_url", origin + "/?checkout=success");
  form.set("cancel_url", origin + "/?checkout=cancel");
  form.set("line_items[0][price]", priceId);
  form.set("line_items[0][quantity]", String(quantity));
  form.set("billing_address_collection", "required");
  form.set("customer_creation", "always");
  form.set("allow_promotion_codes", "true");
  form.set("shipping_address_collection[allowed_countries][0]", "GB");
  form.set("shipping_address_collection[allowed_countries][1]", "US");
  form.set("shipping_address_collection[allowed_countries][2]", "CA");
  form.set("shipping_address_collection[allowed_countries][3]", "FR");
  form.set("shipping_address_collection[allowed_countries][4]", "DE");
  form.set("metadata[product_slug]", typeof body.slug === "string" ? body.slug.slice(0, 80) : "wol-product");

  const response = await fetch(STRIPE_API_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + secretKey,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });

  const payload = await response.json();

  if (!response.ok || !payload.url) {
    return json(
      {
        error: payload && payload.error && payload.error.message ? payload.error.message : "Stripe checkout session creation failed."
      },
      response.status || 500
    );
  }

  return json({ url: payload.url }, 200);
}
