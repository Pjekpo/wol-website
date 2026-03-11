"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const CART_KEY = "wol_collective_cart";
const WAITLIST_KEY = "wol_collective_waitlist";
const DISCOUNT_CLAIM_KEY = "wol_collective_discount_claims";
const SCRATCHCARD_SEEN_KEY = "wol_collective_scratchcard_seen";
const OWNER_PIN = "1234";
const SCRATCH_THRESHOLD = 0.42;
const ENTRY_REVEAL_DURATION_MS = 520;

function formatMoney(value, currency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP"
  }).format(value);
}
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function loadStoredEntries(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadWaitlistEntries() {
  return loadStoredEntries(WAITLIST_KEY);
}

function loadDiscountClaims() {
  return loadStoredEntries(DISCOUNT_CLAIM_KEY);
}

export default function Storefront({ content }) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(content.product.sizeOptions[2] || content.product.sizeOptions[0]);
  const [activeShowcaseFrame, setActiveShowcaseFrame] = useState("front");
  const [cart, setCart] = useState({ quantity: 0, size: content.product.sizeOptions[2] || content.product.sizeOptions[0] });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutState, setCheckoutState] = useState("");
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [waitlistState, setWaitlistState] = useState("");
  const [statusBanner, setStatusBanner] = useState({ text: "", state: "" });
  const [entryUnlocked, setEntryUnlocked] = useState(false);
  const [entryGateVisible, setEntryGateVisible] = useState(true);
  const [ownerAccessOpen, setOwnerAccessOpen] = useState(false);
  const [ownerPin, setOwnerPin] = useState("");
  const [ownerPinMessage, setOwnerPinMessage] = useState("");
  const [entryMediaAvailable, setEntryMediaAvailable] = useState(true);
  const [scratchcardOpen, setScratchcardOpen] = useState(false);
  const [scratchRevealed, setScratchRevealed] = useState(false);
  const [discountEmail, setDiscountEmail] = useState("");
  const [discountClaimState, setDiscountClaimState] = useState("");
  const [discountClaimMessage, setDiscountClaimMessage] = useState("");
  const ownerPinInputRef = useRef(null);
  const scratchCanvasRef = useRef(null);
  const scratchCardRef = useRef(null);
  const scratchPointerActiveRef = useRef(false);
  const scratchLastPointRef = useRef(null);
  const scratchRevealRef = useRef(false);
  const scratchCheckFrameRef = useRef(0);
  const entryRevealTimerRef = useRef(0);

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

  useEffect(() => {
    if (!ownerAccessOpen) {
      return;
    }

    ownerPinInputRef.current?.focus();
  }, [ownerAccessOpen]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SCRATCHCARD_SEEN_KEY)) {
        localStorage.setItem(SCRATCHCARD_SEEN_KEY, new Date().toISOString());
        setScratchcardOpen(true);
      }
    } catch {
      setScratchcardOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!scratchcardOpen && !entryGateVisible) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [scratchcardOpen, entryGateVisible]);

  useEffect(() => {
    if (!scratchcardOpen || scratchRevealed) {
      return undefined;
    }

    function setupScratchCanvas() {
      const canvas = scratchCanvasRef.current;
      const card = scratchCardRef.current;
      if (!canvas || !card) {
        return;
      }

      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        return;
      }

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const surface = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      surface.addColorStop(0, "#8e847a");
      surface.addColorStop(0.5, "#4d453f");
      surface.addColorStop(1, "#181513");
      ctx.fillStyle = surface;
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "rgba(247, 242, 232, 0.6)";
      ctx.lineWidth = 1;
      for (let line = -rect.height; line < rect.width; line += 16) {
        ctx.beginPath();
        ctx.moveTo(line, 0);
        ctx.lineTo(line + rect.height, rect.height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(247, 242, 232, 0.88)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.max(16, rect.width * 0.072)}px Arial`;
      ctx.fillText("SCRATCH", rect.width / 2, rect.height / 2 - 12);

      ctx.font = `600 ${Math.max(11, rect.width * 0.032)}px Arial`;
      ctx.fillStyle = "rgba(247, 242, 232, 0.74)";
      ctx.fillText("to reveal your welcome reward", rect.width / 2, rect.height / 2 + 24);
    }

    setupScratchCanvas();
    window.addEventListener("resize", setupScratchCanvas);

    return () => {
      window.removeEventListener("resize", setupScratchCanvas);
      if (scratchCheckFrameRef.current) {
        window.cancelAnimationFrame(scratchCheckFrameRef.current);
        scratchCheckFrameRef.current = 0;
      }
    };
  }, [scratchcardOpen, scratchRevealed]);

  useEffect(() => {
    return () => {
      if (entryRevealTimerRef.current) {
        window.clearTimeout(entryRevealTimerRef.current);
      }
    };
  }, []);

  const cartSubtotal = useMemo(() => {
    return formatMoney(cart.quantity * content.product.price, content.product.currency);
  }, [cart.quantity, content.product.currency, content.product.price]);

  const showcaseFrames = [
    {
      id: "front",
      label: "Front",
      position: "center 50%",
      scale: 1
    },
    {
      id: "mark",
      label: "Mark",
      position: "center 24%",
      scale: 1.48
    },
    {
      id: "body",
      label: "Body",
      position: "center 44%",
      scale: 1.18
    },
    {
      id: "hem",
      label: "Hem",
      position: "center 74%",
      scale: 1.32
    }
  ];
  const currentShowcaseFrame = showcaseFrames.find(function (frame) {
    return frame.id === activeShowcaseFrame;
  }) || showcaseFrames[0];
  const showcaseProductName = content.product.name.replace(/^Product\s*\d+:\s*/i, "");

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

  async function handleDiscountClaimSubmit(event) {
    event.preventDefault();

    const normalized = discountEmail.trim().toLowerCase();
    if (!validateEmail(normalized)) {
      setDiscountClaimState("error");
      setDiscountClaimMessage("Please enter a valid email address.");
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
          body: JSON.stringify({
            email: normalized,
            source: "scratchcard",
            reward: "10% off"
          })
        });

        if (!response.ok) {
          throw new Error("Endpoint rejected request.");
        }

        setDiscountClaimState("success");
        setDiscountClaimMessage("Discount claim received. Check your inbox.");
        setDiscountEmail("");
        return;
      } catch {
        setDiscountClaimState("error");
        setDiscountClaimMessage("Claim endpoint failed, so the email was saved only in this browser.");
      }
    }

    const claims = loadDiscountClaims();
    const exists = claims.some(function (entry) {
      return entry.email === normalized;
    });

    if (exists) {
      setDiscountClaimState("success");
      setDiscountClaimMessage("This discount claim is already saved in this browser.");
      return;
    }

    claims.unshift({
      email: normalized,
      reward: "10% off",
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(DISCOUNT_CLAIM_KEY, JSON.stringify(claims));
    setDiscountClaimState("success");
    setDiscountClaimMessage("Discount claim saved in this browser.");
    setDiscountEmail("");
  }

  function handleOwnerAccessSubmit(event) {
    event.preventDefault();

    if (ownerPin.trim() === OWNER_PIN) {
      if (entryRevealTimerRef.current) {
        window.clearTimeout(entryRevealTimerRef.current);
      }
      setEntryUnlocked(true);
      setOwnerPin("");
      setOwnerPinMessage("");
      entryRevealTimerRef.current = window.setTimeout(() => {
        setEntryGateVisible(false);
        entryRevealTimerRef.current = 0;
      }, ENTRY_REVEAL_DURATION_MS);
      return;
    }

    setOwnerPinMessage("You arent the owner broski, move along");
  }

  function openOwnerAccess() {
    setOwnerAccessOpen(true);
  }

  function revealScratchcard() {
    if (scratchRevealRef.current) {
      return;
    }

    scratchRevealRef.current = true;
    scratchPointerActiveRef.current = false;
    scratchLastPointRef.current = null;
    setScratchRevealed(true);
  }

  function scheduleScratchProgressCheck() {
    if (scratchCheckFrameRef.current || scratchRevealRef.current) {
      return;
    }

    scratchCheckFrameRef.current = window.requestAnimationFrame(() => {
      scratchCheckFrameRef.current = 0;

      const canvas = scratchCanvasRef.current;
      const ctx = canvas?.getContext("2d", { willReadFrequently: true });
      if (!canvas || !ctx) {
        return;
      }

      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let cleared = 0;
      let total = 0;

      for (let index = 3; index < pixels.length; index += 32) {
        total += 1;
        if (pixels[index] === 0) {
          cleared += 1;
        }
      }

      if (total > 0 && cleared / total >= SCRATCH_THRESHOLD) {
        revealScratchcard();
      }
    });
  }

  function eraseScratchSurface(clientX, clientY) {
    const canvas = scratchCanvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx || scratchRevealRef.current) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      return;
    }

    const radius = Math.max(22, rect.width * 0.08);
    const previousPoint = scratchLastPointRef.current;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = radius * 2;

    if (previousPoint) {
      ctx.beginPath();
      ctx.moveTo(previousPoint.x, previousPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    scratchLastPointRef.current = { x, y };
    scheduleScratchProgressCheck();
  }

  function handleScratchPointerDown(event) {
    if (scratchRevealRef.current) {
      return;
    }

    event.preventDefault();
    scratchPointerActiveRef.current = true;
    scratchLastPointRef.current = null;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    eraseScratchSurface(event.clientX, event.clientY);
  }

  function handleScratchPointerMove(event) {
    if (!scratchPointerActiveRef.current || scratchRevealRef.current) {
      return;
    }

    event.preventDefault();
    eraseScratchSurface(event.clientX, event.clientY);
  }

  function handleScratchPointerEnd(event) {
    scratchPointerActiveRef.current = false;
    scratchLastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function closeScratchcard() {
    scratchPointerActiveRef.current = false;
    scratchLastPointRef.current = null;
    setScratchcardOpen(false);
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  const scratchcardModal = scratchcardOpen ? (
    <div className="scratchcard-overlay" role="dialog" aria-modal="true" aria-labelledby="scratchcardTitle">
      <div className="scratchcard-modal">
        <button className="scratchcard-close" type="button" onClick={closeScratchcard}>
          Close
        </button>
        <p className="scratchcard-kicker">First load reward</p>
        <h2 id="scratchcardTitle">Scratch the card to unlock your welcome offer.</h2>
        <p className="scratchcard-copy">Clear enough of the surface to reveal a private WOL discount.</p>

        <div ref={scratchCardRef} className={`scratchcard-stage ${scratchRevealed ? "is-revealed" : ""}`}>
          <div className="scratchcard-prize">
            <p className="scratchcard-prize-kicker">Unlocked</p>
            <h3>You won 10% off</h3>
            <p>Enter your email below to claim the discount.</p>
          </div>
          <canvas
            ref={scratchCanvasRef}
            className={`scratchcard-canvas ${scratchRevealed ? "is-cleared" : ""}`}
            onPointerDown={handleScratchPointerDown}
            onPointerMove={handleScratchPointerMove}
            onPointerUp={handleScratchPointerEnd}
            onPointerCancel={handleScratchPointerEnd}
            aria-label="Scratch card"
          />
        </div>

        <div className={`scratchcard-claim ${scratchRevealed ? "is-visible" : ""}`}>
          <form className="scratchcard-form" onSubmit={handleDiscountClaimSubmit}>
            <label htmlFor="scratchcardEmail">Email address</label>
            <div className="scratchcard-form-row">
              <input
                id="scratchcardEmail"
                type="email"
                value={discountEmail}
                onChange={(event) => {
                  setDiscountEmail(event.target.value);
                  setDiscountClaimState("");
                  setDiscountClaimMessage("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <button className="primary-button scratchcard-submit" type="submit">Claim 10%</button>
            </div>
            <p className="scratchcard-note">Scratch with your finger or mouse. Your claim stays in this browser if no live endpoint is connected.</p>
            <p className={`inline-message ${discountClaimState}`}>{discountClaimMessage}</p>
          </form>
        </div>
      </div>
    </div>
  ) : null;

  const entryScreen = entryGateVisible ? (
    <section className={`entry-screen ${entryUnlocked ? "is-exiting" : ""}`}>
      <div className="entry-media-shell">
        {entryMediaAvailable ? (
          <picture className="entry-picture">
            <source media="(min-width: 1180px) and (hover: hover) and (pointer: fine)" srcSet="/Landing%20page.png" />
            <img
              className="entry-media"
              src="/LandingPagePhone.png"
              alt={content.entry.alt}
              onError={() => setEntryMediaAvailable(false)}
            />
          </picture>
        ) : (
          <div className="entry-media entry-media-fallback">
            <p>Add your GIF at <code>public/owner-entry.gif</code>.</p>
          </div>
        )}
      </div>

      <div className={`entry-owner ${ownerAccessOpen ? "is-open" : ""}`}>
        <button
          className={`owner-access-trigger ${ownerAccessOpen ? "is-hidden" : ""}`}
          type="button"
          onClick={openOwnerAccess}
          onPointerDown={openOwnerAccess}
          onTouchStart={openOwnerAccess}
        >
          {content.entry.ownerLabel}
        </button>
        <form className={`owner-access-form ${ownerAccessOpen ? "is-visible" : ""}`} onSubmit={handleOwnerAccessSubmit}>
          <label className="owner-access-label" htmlFor="ownerPinInput">{content.entry.ownerLabel}</label>
          <div className="owner-access-row">
            <input
              id="ownerPinInput"
              ref={ownerPinInputRef}
              className="owner-pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={ownerPin}
              onChange={(event) => {
                setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                setOwnerPinMessage("");
              }}
              placeholder="PIN"
              autoComplete="off"
            />
            <button className="owner-access-submit" type="submit">Enter</button>
          </div>
          <p className={`owner-access-message ${ownerPinMessage ? "visible" : ""}`}>{ownerPinMessage || " "}</p>
        </form>
      </div>
    </section>
  ) : null;

  return (
    <>
      {scratchcardModal}
      <div className={`storefront-shell ${entryUnlocked ? "is-visible" : ""}`} aria-hidden={!entryUnlocked}>
        <main className="rebuild-site" id="top">
          <section className="brand-banner" aria-label="Site banner">
            <div className="brand-banner-wordmark-wrap">
              <p className="brand-banner-wordmark">thewolcollective</p>
            </div>
            <div className="brand-banner-actions" aria-label="Banner actions">
              <button className="brand-banner-action" type="button" aria-label="Search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16L21 21" />
                </svg>
              </button>
              <button className="brand-banner-action" type="button" aria-label="Account">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5 20C5 16.8 8 14.5 12 14.5C16 14.5 19 16.8 19 20" />
                </svg>
              </button>
              <button className="brand-banner-action" type="button" aria-label="Bag">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6.5 8.5H17.5L16.5 20H7.5L6.5 8.5Z" />
                  <path d="M9 9V7.5C9 5.57 10.57 4 12.5 4C14.43 4 16 5.57 16 7.5V9" />
                </svg>
              </button>
            </div>
          </section>
          <section className="product-showcase" aria-labelledby="productShowcaseTitle">
            <div className="product-showcase-shell">
              <div className="product-showcase-gallery">
                <div className="product-showcase-main">
                  <div className="product-showcase-aura" aria-hidden="true" />
                  <img
                    className="product-showcase-image"
                    src="/product.jpg"
                    alt={`${showcaseProductName} showcase`}
                    style={{
                      objectPosition: currentShowcaseFrame.position,
                      transform: `scale(${currentShowcaseFrame.scale})`
                    }}
                  />
                </div>
                <div className="product-showcase-thumbs" aria-label="Product gallery views">
                  {showcaseFrames.map(function (frame) {
                    const isActive = frame.id === activeShowcaseFrame;

                    return (
                      <button
                        key={frame.id}
                        className={`product-showcase-thumb ${isActive ? "is-active" : ""}`}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setActiveShowcaseFrame(frame.id)}
                      >
                        <span className="product-showcase-thumb-media">
                          <img
                            src="/product.jpg"
                            alt=""
                            aria-hidden="true"
                            style={{
                              objectPosition: frame.position,
                              transform: `scale(${frame.scale})`
                            }}
                          />
                        </span>
                        <span className="product-showcase-thumb-label">{frame.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <article className="product-showcase-panel" id="showcase-details">
                <p className="product-showcase-kicker">{content.brand.badge}</p>
                <h2 id="productShowcaseTitle">{showcaseProductName}</h2>
                <div className="product-showcase-price-row">
                  <p className="product-showcase-price">{content.product.priceLabel}</p>
                  <p className="product-showcase-price-note">Single-release piece</p>
                </div>

                <div className="product-showcase-option">
                  <p className="product-showcase-option-label">Size</p>
                  <div className="product-showcase-sizes" aria-label="Size options">
                    {content.product.sizeOptions.map(function (size) {
                      const isSelected = size === selectedSize;

                      return (
                        <button
                          key={size}
                          className={`product-showcase-size ${isSelected ? "is-active" : ""}`}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedSize(size)}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="product-showcase-option">
                  <p className="product-showcase-option-label">Quantity</p>
                  <div className="product-showcase-quantity" aria-label="Quantity controls">
                    <button type="button" aria-label="Decrease quantity" onClick={() => updateSelectedQuantity(-1)}>-</button>
                    <span>{selectedQuantity}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => updateSelectedQuantity(1)}>+</button>
                  </div>
                </div>

                <button className="product-showcase-cart" type="button" onClick={addToCart}>Add to cart</button>
                <a className="product-showcase-link" href="#showcase-copy">
                  View full details
                  <span aria-hidden="true">{"->"}</span>
                </a>

                <div className="product-showcase-copy" id="showcase-copy">
                  <p>{content.product.description}</p>
                  <p>{content.product.story}</p>
                </div>

                <p className={`inline-message ${checkoutState}`}>{checkoutMessage}</p>
              </article>
            </div>
          </section>
          <footer className="brand-footer" aria-label="Site footer">
            <div className="brand-footer-grid">
              <div className="brand-footer-brand">
                <p className="brand-footer-kicker">{content.footer.right}</p>
                <p className="brand-footer-copy">{content.hero.text}</p>
              </div>
              <div className="brand-footer-wordmark-slot">
                <p className="brand-footer-wordmark">thewolcollective</p>
              </div>
              <div className="brand-footer-column brand-footer-column-info">
                <h2>Information</h2>
                <a href="#top">About us</a>
                <a href="#top">Privacy policy</a>
                <a href="#top">Shipping policy</a>
                <a href="#top">Terms of service</a>
                <a href="#top">Contact us</a>
                <div className="brand-footer-socials" aria-label="Social links">
                  <button className="brand-footer-social" type="button" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="4.5" y="4.5" width="15" height="15" rx="4" />
                      <circle cx="12" cy="12" r="3.5" />
                      <circle cx="17.25" cy="6.75" r="0.8" fill="currentColor" stroke="none" />
                    </svg>
                  </button>
                  <button className="brand-footer-social" type="button" aria-label="Pinterest">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12.2 4C7.9 4 5 6.95 5 10.9C5 13.5 6.47 15.68 8.7 16.5L9.7 12.72C9.49 12.28 9.39 11.79 9.39 11.28C9.39 9.84 10.22 8.76 11.25 8.76C12.13 8.76 12.56 9.42 12.56 10.22C12.56 11.15 11.97 12.55 11.67 13.82C11.42 14.88 12.2 15.75 13.25 15.75C15.13 15.75 16.39 13.77 16.39 10.93C16.39 8.41 14.57 6.66 11.96 6.66C9 6.66 7.27 8.88 7.27 11.18C7.27 12.12 7.63 13.13 8.08 13.68C8.18 13.8 8.2 13.9 8.17 14.05L7.82 15.43C7.77 15.62 7.66 15.66 7.49 15.58C5.48 14.65 4.22 12.62 4.22 10.35C4.22 6.3 7.16 2.58 12.69 2.58C17.13 2.58 20.58 5.74 20.58 9.98C20.58 14.4 17.79 17.95 13.92 17.95C12.78 17.95 11.71 17.36 11.35 16.66L10.65 19.3C10.4 20.25 9.72 21.44 9.17 22.2C10.11 22.49 11.12 22.64 12.17 22.64C17.29 22.64 21.44 18.49 21.44 13.37C21.44 8.15 17.26 4 12.2 4Z" />
                    </svg>
                  </button>
                  <button className="brand-footer-social" type="button" aria-label="Email">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
                      <path d="M4.5 8L12 13.5L19.5 8" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="brand-footer-column brand-footer-column-customer">
                <h2>For Customers</h2>
                <a href="#top">Orders</a>
                <a href="#top">Profile</a>
                <a href="#top">Waitlist</a>
              </div>
            </div>
            <div className="brand-footer-meta">
              <p className="brand-footer-copyright">Copyright {new Date().getFullYear()} THEWOLCOLLECTIVE</p>
              <button className="brand-footer-top" type="button" aria-label="Back to top" onClick={scrollToTop}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 14L12 8L18 14" />
                </svg>
              </button>
            </div>
          </footer>
        </main>
      </div>
      {entryScreen}
    </>
  );
}
