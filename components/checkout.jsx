"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import content from "../data/content.json";
import {
  CART_KEY,
  getCartQuantity,
  getCartSubtotal,
  parseStoredCart
} from "../lib/cart";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function formatMoney(value, currency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP"
  }).format(value);
}

export default function Checkout() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const productName = content.product.name.replace(/^Product\s*\d+:\s*/i, "");
  const totalQuantity = useMemo(() => {
    return getCartQuantity(cart);
  }, [cart]);
  const subtotal = useMemo(() => {
    return formatMoney(getCartSubtotal(cart, content.product.price), content.product.currency);
  }, [cart, content.product.currency, content.product.price]);

  useEffect(() => {
    try {
      setCart(parseStoredCart(localStorage.getItem(CART_KEY)));
    } catch {
      setCheckoutError("We could not read your cart. Head back and try checkout again.");
    } finally {
      setCartLoaded(true);
    }
  }, []);

  const checkoutOptions = useMemo(() => {
    if (!cartLoaded || cart.length <= 0) {
      return null;
    }

    return {
      fetchClientSecret: async function fetchClientSecret() {
        const response = await fetch("/api/create-embedded-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            items: cart,
            slug: content.product.slug
          })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.clientSecret) {
          const message = payload.error || "Unable to start embedded checkout.";
          setCheckoutError(message);
          throw new Error(message);
        }

        return payload.clientSecret;
      },
      onComplete: function handleCheckoutComplete() {
        try {
          localStorage.removeItem(CART_KEY);
        } catch {
          // Ignore storage issues and still route back to the cart.
        }

        router.replace("/cart?checkout=success");
      }
    };
  }, [cart, cartLoaded, router]);

  function goBackToCart() {
    router.push("/cart");
  }

  return (
    <main className="checkout-page">
      <header className="checkout-page-header">
        <button className="checkout-page-back" type="button" onClick={goBackToCart}>Back to cart</button>
        <p className="checkout-page-wordmark">thewolcollective</p>
      </header>

      <section className="checkout-page-shell">
        <div className="checkout-page-intro">
          <p className="checkout-page-kicker">Secure checkout</p>
          <h1>Complete your order</h1>
          <p>Enter your shipping and payment details below. Your 10% code can be applied directly in Stripe.</p>
        </div>

        {!publishableKey ? (
          <div className="checkout-page-state">
            <p>Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` before using embedded checkout.</p>
          </div>
        ) : null}

        {checkoutError ? (
          <p className="inline-message error">{checkoutError}</p>
        ) : null}

        {!cartLoaded ? (
          <div className="checkout-page-state">
            <p>Loading your cart...</p>
          </div>
        ) : null}

        {cartLoaded && cart.length <= 0 ? (
          <div className="checkout-page-state">
            <p>Your cart is empty.</p>
            <button className="checkout-page-return" type="button" onClick={goBackToCart}>Return to cart</button>
          </div>
        ) : null}

        {cartLoaded && cart.length > 0 ? (
          <div className="checkout-page-grid">
            <aside className="checkout-page-summary">
              <p className="checkout-page-kicker">Order</p>
              <div className="checkout-page-product">
                <div className="checkout-page-product-media">
                  <img src="/product.jpg" alt={productName} />
                </div>
                <div className="checkout-page-product-copy">
                  <h2>{productName}</h2>
                  <div className="checkout-page-line-items">
                    {cart.map(function (item) {
                      return (
                        <p key={item.size}>
                          Size {item.size} x {item.quantity}
                        </p>
                      );
                    })}
                  </div>
                  <p>Total items {totalQuantity}</p>
                </div>
              </div>
              <div className="checkout-page-summary-row">
                <span>Subtotal</span>
                <strong>{subtotal}</strong>
              </div>
              <p className="checkout-page-summary-note">Promotion codes can be entered inside the Stripe checkout panel.</p>
            </aside>

            <div className="checkout-page-embed-shell">
              {stripePromise && checkoutOptions ? (
                <EmbeddedCheckoutProvider stripe={stripePromise} options={checkoutOptions}>
                  <EmbeddedCheckout className="checkout-page-embed" />
                </EmbeddedCheckoutProvider>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
