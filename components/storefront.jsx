"use client";

import { useEffect, useMemo, useState } from "react";

const CART_KEY = "wol_collective_cart";
const WAITLIST_KEY = "wol_collective_waitlist";

function formatMoney(value, currency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP"
  }).format(value);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function loadWaitlistEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Storefront({ content }) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(content.product.sizeOptions[2] || content.product.sizeOptions[0]);
  const [cart, setCart] = useState({ quantity: 0, size: content.product.sizeOptions[2] || content.product.sizeOptions[0] });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutState, setCheckoutState] = useState("");
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [waitlistState, setWaitlistState] = useState("");
  const [statusBanner, setStatusBanner] = useState({ text: "", state: "" });

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
          size: parsed.size || content.product.sizeOptions[2] || content.product.sizeOptions[0]
        });
      }
    } catch {
      return;
    }
  }, [content.product.sizeOptions]);

  useEffect(() => {
    if (cart.quantity > 0) {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } else {
      localStorage.removeItem(CART_KEY);
    }
  }, [cart]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      setCart({ quantity: 0, size: selectedSize });
      setStatusBanner({ text: "Payment complete. Stripe redirected back successfully.", state: "success" });
    }
    if (checkout === "cancel") {
      setStatusBanner({ text: "Checkout was cancelled. Your cart is still available.", state: "error" });
    }
  }, []);

  const cartSubtotal = useMemo(() => {
    return formatMoney(cart.quantity * content.product.price, content.product.currency);
  }, [cart.quantity, content.product.currency, content.product.price]);

  function updateSelectedQuantity(delta) {
    setSelectedQuantity(function (current) {
      return Math.max(1, Math.min(10, current + delta));
    });
  }

  function updateCartQuantity(nextQuantity) {
    setCart(function (current) {
      return {
        ...current,
        quantity: Math.max(0, Math.min(10, nextQuantity))
      };
    });
  }

  function addToCart() {
    setCart({
      quantity: Math.max(0, Math.min(10, cart.quantity + selectedQuantity)),
      size: selectedSize
    });
    setCheckoutState("success");
    setCheckoutMessage("Added to cart.");
    setCartOpen(true);
  }

  async function startCheckout(quantity, size) {
    try {
      setCheckoutState("success");
      setCheckoutMessage("Creating secure checkout...");

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          quantity,
          size,
          slug: content.product.slug
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setCheckoutState("error");
        setCheckoutMessage(payload.error || "Unable to start checkout.");
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setCheckoutState("error");
      setCheckoutMessage("Checkout request failed. Check your deployment and Stripe configuration.");
    }
  }

  async function handleBuyNow() {
    setCart({ quantity: selectedQuantity, size: selectedSize });
    setCartOpen(true);
    await startCheckout(selectedQuantity, selectedSize);
  }

  async function handleCheckoutFromCart() {
    if (cart.quantity <= 0) {
      setCheckoutState("error");
      setCheckoutMessage("Add the product to your cart first.");
      return;
    }

    await startCheckout(cart.quantity, cart.size);
  }

  async function handleWaitlistSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();

    if (!validateEmail(email)) {
      setWaitlistState("error");
      setWaitlistMessage("Please enter a valid email address.");
      return;
    }

    const endpoint = content.waitlist.endpoint || "";

    if (endpoint) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          throw new Error("Endpoint rejected request.");
        }

        setWaitlistState("success");
        setWaitlistMessage("You are on the waitlist.");
        event.currentTarget.reset();
        return;
      } catch {
        setWaitlistState("error");
        setWaitlistMessage("External form failed, so the email was saved only in this browser.");
      }
    }

    const entries = loadWaitlistEntries();
    const normalized = email.toLowerCase();
    const exists = entries.some(function (entry) {
      return entry.email === normalized;
    });

    if (exists) {
      setWaitlistState("success");
      setWaitlistMessage("This email is already saved in this browser.");
      return;
    }

    entries.unshift({ email: normalized, createdAt: new Date().toISOString() });
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(entries));
    setWaitlistState("success");
    setWaitlistMessage("Email saved in this browser.");
    event.currentTarget.reset();
  }

  return (
    <>
      {statusBanner.text ? <div className={`status-banner ${statusBanner.state}`}>{statusBanner.text}</div> : null}
      <header className="topbar">
        <div>
          <p className="brand-kicker">{content.brand.name}</p>
          <p className="nav-copy">{content.brand.navTagline}</p>
        </div>
        <nav className="topbar-actions">
          <a className="ghost-link" href="#product">Product</a>
          <a className="ghost-link" href="#waitlist">Waitlist</a>
          <button className="cart-button" type="button" onClick={() => setCartOpen(true)}>
            Cart
            <span className="cart-count">{cart.quantity}</span>
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="badge">{content.brand.badge}</p>
            <h1 className="hero-lockup">
              <span>{content.hero.headline[0]}</span>
              <span className="outlined">{content.hero.headline[1]}</span>
              <span>{content.hero.headline[2]}</span>
            </h1>
          </div>
          <div className="hero-panel">
            <h2>{content.hero.title}</h2>
            <p>{content.hero.text}</p>
            <div className="chip-row">
              {content.hero.chips.map((chip) => (
                <span className="chip" key={chip}>{chip}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="manifesto">
          <p className="section-label">Manifesto</p>
          <h2>{content.manifesto.heading}</h2>
          <p>{content.manifesto.body}</p>
        </section>

        <section id="product" className="product-section">
          <div className="product-media">
            <div className="product-image" style={{ backgroundImage: `url(${content.product.image})` }} />
          </div>
          <article className="product-card">
            <p className="section-label">Featured Product</p>
            <h2>{content.product.name}</h2>
            <p className="product-description">{content.product.description}</p>
            <p className="product-story">{content.product.story}</p>
            <div className="product-meta">
              <p className="price">{content.product.priceLabel}</p>
              <p className="sizes">{content.product.sizes}</p>
            </div>

            <div className="purchase-block">
              <div className="selectors-row">
                <div className="quantity-card">
                  <p className="quantity-label">Quantity</p>
                  <div className="quantity-controls">
                    <button className="qty-button" type="button" onClick={() => updateSelectedQuantity(-1)}>-</button>
                    <span className="qty-value">{selectedQuantity}</span>
                    <button className="qty-button" type="button" onClick={() => updateSelectedQuantity(1)}>+</button>
                  </div>
                </div>
                <div className="size-card">
                  <label className="size-label" htmlFor="sizeSelect">Size</label>
                  <select id="sizeSelect" className="size-select" value={selectedSize} onChange={(event) => setSelectedSize(event.target.value)}>
                    {content.product.sizeOptions.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="action-row">
                <button className="primary-button" type="button" onClick={addToCart}>Add To Cart</button>
                <button className="secondary-button" type="button" onClick={handleBuyNow}>Buy Now</button>
              </div>
              <p className={`inline-message ${checkoutState}`}>{checkoutMessage}</p>
            </div>
          </article>
        </section>

        <section className="lookbook">
          <div className="section-head">
            <p className="section-label">Campaign Frames</p>
            <h2>Presence in three studies.</h2>
          </div>
          <div className="lookbook-grid">
            {content.lookbook.map((item) => (
              <article className="lookbook-card" key={item.label}>
                <div className="lookbook-image" style={{ backgroundImage: `url(${item.image})` }} />
                <div className="lookbook-copy">
                  <p className="section-label">{item.label}</p>
                  <h3>{item.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="concept-section">
          <div className="section-head">
            <p className="section-label">Future Capsules</p>
            <h2>Concepts that treat fabric as archive.</h2>
          </div>
          <div className="concept-grid">
            {content.concepts.map((concept) => (
              <article className="concept-card" key={concept.title}>
                <h3>{concept.title}</h3>
                <p>{concept.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="waitlist" className="waitlist-section">
          <div className="waitlist-card">
            <div>
              <p className="section-label">Waitlist</p>
              <h2>{content.waitlist.title}</h2>
              <p>{content.waitlist.body}</p>
            </div>
            <form className="waitlist-form" onSubmit={handleWaitlistSubmit}>
              <label htmlFor="waitlistEmail">Email address</label>
              <div className="waitlist-row">
                <input id="waitlistEmail" type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
                <button className="primary-button" type="submit">{content.waitlist.button}</button>
              </div>
              <p className="waitlist-note">{content.waitlist.note}</p>
              <p className={`inline-message ${waitlistState}`}>{waitlistMessage}</p>
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>{content.footer.left}</span>
        <span>{content.footer.right}</span>
      </footer>

      <div className={`cart-overlay ${cartOpen ? "visible" : ""}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer ${cartOpen ? "is-open" : ""}`} aria-hidden={!cartOpen}>
        <div className="cart-header">
          <div>
            <p className="section-label">Cart</p>
            <h2>Your order</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => setCartOpen(false)}>x</button>
        </div>

        {cart.quantity <= 0 ? (
          <div className="cart-empty">
            <p>Your cart is empty.</p>
            <p>Add the overshirt to begin checkout.</p>
          </div>
        ) : (
          <div className="cart-content">
            <article className="cart-line">
              <div>
                <p className="cart-product-name">{content.product.name}</p>
                <p className="cart-product-meta">{content.product.priceLabel} each / Size {cart.size}</p>
              </div>
              <p className="cart-line-total">{cartSubtotal}</p>
            </article>
            <div className="cart-quantity-row">
              <span className="cart-qty-label">Quantity</span>
              <div className="quantity-controls compact">
                <button className="qty-button" type="button" onClick={() => updateCartQuantity(cart.quantity - 1)}>-</button>
                <span className="qty-value">{cart.quantity}</span>
                <button className="qty-button" type="button" onClick={() => updateCartQuantity(cart.quantity + 1)}>+</button>
              </div>
            </div>
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <strong>{cartSubtotal}</strong>
            </div>
            <button className="primary-button full-width" type="button" onClick={handleCheckoutFromCart}>Checkout With Stripe</button>
            <p className="cart-note">Secure checkout opens in a hosted Stripe page.</p>
          </div>
        )}
      </aside>
    </>
  );
}
