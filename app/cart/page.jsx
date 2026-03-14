"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import content from "../../data/content.json";
import {
  CART_KEY,
  getCartQuantity,
  getCartSubtotal,
  parseStoredCart,
  updateCartItemQuantity
} from "../../lib/cart";

function formatMoney(value, currency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP"
  }).format(value);
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [checkoutState, setCheckoutState] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const productName = content.product.name.replace(/^Product\s*\d+:\s*/i, "");

  useEffect(() => {
    try {
      setCart(parseStoredCart(localStorage.getItem(CART_KEY)));
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } else {
      localStorage.removeItem(CART_KEY);
    }
  }, [cart]);

  useEffect(() => {
    const checkout = new URLSearchParams(window.location.search).get("checkout");

    if (checkout === "success") {
      setCheckoutState("success");
      setCheckoutMessage("Payment complete. Stripe redirected back successfully.");
      setCart([]);

      try {
        localStorage.removeItem(CART_KEY);
      } catch {
        return;
      }

      return;
    }

    if (checkout === "cancel") {
      setCheckoutState("error");
      setCheckoutMessage("Checkout was cancelled. Your cart is still available.");
      return;
    }

    setCheckoutState("");
    setCheckoutMessage("");
  }, []);

  const totalQuantity = useMemo(() => {
    return getCartQuantity(cart);
  }, [cart]);

  const subtotal = useMemo(() => {
    return formatMoney(getCartSubtotal(cart, content.product.price), content.product.currency);
  }, [cart, content.product.currency, content.product.price]);

  function updateQuantity(size, delta) {
    setCart(function (current) {
      const existingItem = current.find(function (item) {
        return item.size === size;
      });

      return updateCartItemQuantity(current, size, (existingItem?.quantity || 0) + delta);
    });
  }

  function goBackToStore() {
    router.push("/");
  }

  async function handleCheckout() {
    if (totalQuantity <= 0) {
      setCheckoutState("error");
      setCheckoutMessage("Add the product to your cart first.");
      return;
    }

    try {
      setCheckoutBusy(true);
      setCheckoutState("");
      setCheckoutMessage("Opening secure checkout...");
      router.push("/checkout");
    } catch {
      setCheckoutState("error");
      setCheckoutMessage("Checkout request failed. Check your deployment and Stripe configuration.");
      setCheckoutBusy(false);
    }
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
          <p>Review your item below and continue to Stripe Checkout when you are ready.</p>
          {checkoutMessage ? <p className={`inline-message ${checkoutState}`}>{checkoutMessage}</p> : null}
        </div>

        {totalQuantity <= 0 ? (
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
                <div className="cart-page-line-items" aria-label="Selected sizes">
                  {cart.map(function (item) {
                    return (
                      <div className="cart-page-line" key={item.size}>
                        <div className="cart-page-line-copy">
                          <p className="cart-page-item-meta">Size {item.size}</p>
                        </div>
                        <div className="cart-page-quantity-controls" aria-label={`Quantity controls for size ${item.size}`}>
                          <button type="button" aria-label={`Decrease quantity for size ${item.size}`} onClick={() => updateQuantity(item.size, -1)}>-</button>
                          <strong>{item.quantity}</strong>
                          <button type="button" aria-label={`Increase quantity for size ${item.size}`} onClick={() => updateQuantity(item.size, 1)}>+</button>
                        </div>
                      </div>
                    );
                  })}
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
                <span>Total items</span>
                <span>{totalQuantity}</span>
              </div>
              <div className="cart-page-summary-row">
                <span>Sizes</span>
                <span>{cart.map(function (item) { return item.size; }).join(", ")}</span>
              </div>
              <div className="cart-page-summary-row total">
                <span>Subtotal</span>
                <strong>{subtotal}</strong>
              </div>
              <button className="cart-page-checkout" type="button" onClick={handleCheckout} disabled={checkoutBusy || totalQuantity <= 0}>
                {checkoutBusy ? "Opening..." : "Checkout"}
              </button>
              <p className="cart-page-note">Your discount code can be entered inside the secure Stripe checkout page.</p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
