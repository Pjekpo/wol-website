"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import content from "../../data/content.json";

const CART_KEY = "wol_collective_cart";

function formatMoney(value, currency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP"
  }).format(value);
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState({
    quantity: 0,
    size: ""
  });
  const productName = content.product.name.replace(/^Product\s*\d+:\s*/i, "");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.quantity === "number") {
        setCart({
          quantity: Math.max(0, Math.min(10, parsed.quantity)),
          size: parsed.size || ""
        });
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (cart.quantity > 0) {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } else {
      localStorage.removeItem(CART_KEY);
    }
  }, [cart]);

  const subtotal = useMemo(() => {
    return formatMoney(cart.quantity * content.product.price, content.product.currency);
  }, [cart.quantity]);

  function updateQuantity(delta) {
    setCart(function (current) {
      return {
        ...current,
        quantity: Math.max(0, Math.min(10, current.quantity + delta))
      };
    });
  }

  function goBackToStore() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <main className="cart-page">
      <header className="cart-page-header">
        <button className="cart-page-back" type="button" onClick={goBackToStore}>Back to store</button>
        <p className="cart-page-wordmark">thewolcollective</p>
      </header>

      <section className="cart-page-shell">
        <div className="cart-page-intro">
          <p className="cart-page-kicker">Cart</p>
          <h1>Your selection</h1>
          <p>Review your item below. Checkout is visible for the flow, but it is inactive for now.</p>
        </div>

        {cart.quantity <= 0 ? (
          <div className="cart-page-empty">
            <p>Your cart is empty.</p>
            <button className="cart-page-return" type="button" onClick={goBackToStore}>Return to product</button>
          </div>
        ) : (
          <div className="cart-page-grid">
            <article className="cart-page-item">
              <div className="cart-page-image-wrap">
                <img className="cart-page-image" src="/product.jpg" alt={productName} />
              </div>
              <div className="cart-page-item-copy">
                <p className="cart-page-item-kicker">{content.brand.badge}</p>
                <h2>{productName}</h2>
                <p className="cart-page-item-meta">Size {cart.size || "Not selected"}</p>
                <div className="cart-page-quantity">
                  <span>Quantity</span>
                  <div className="cart-page-quantity-controls" aria-label="Cart quantity controls">
                    <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(-1)}>-</button>
                    <strong>{cart.quantity}</strong>
                    <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(1)}>+</button>
                  </div>
                </div>
              </div>
            </article>

            <aside className="cart-page-summary">
              <p className="cart-page-kicker">Summary</p>
              <div className="cart-page-summary-row">
                <span>Item</span>
                <span>{content.product.priceLabel}</span>
              </div>
              <div className="cart-page-summary-row">
                <span>Quantity</span>
                <span>{cart.quantity}</span>
              </div>
              <div className="cart-page-summary-row total">
                <span>Subtotal</span>
                <strong>{subtotal}</strong>
              </div>
              <button className="cart-page-checkout" type="button" disabled>
                Checkout
              </button>
              <p className="cart-page-note">Checkout is intentionally inactive right now.</p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
