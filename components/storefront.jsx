"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CART_KEY,
  addCartItem,
  getCartQuantity,
  parseStoredCart
} from "../lib/cart";

const ENTRY_UNLOCKED_KEY = "wol_collective_entry_unlocked";
const OWNER_PIN = "1234";
const SCRATCH_THRESHOLD = 0.42;
const ENTRY_REVEAL_DURATION_MS = 520;
const CONTACT_EMAIL = "thewolcollective@gmail.com";

function formatMoney(value, currency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP"
  }).format(value);
}
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Storefront({ content }) {
  const router = useRouter();
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [activeShowcaseFrame, setActiveShowcaseFrame] = useState("front");
  const [cart, setCart] = useState([]);
  const [cartNoticeVisible, setCartNoticeVisible] = useState(false);
  const [cartNoticeText, setCartNoticeText] = useState("");
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
  const [mailChooserOpen, setMailChooserOpen] = useState(false);
  const ownerPinInputRef = useRef(null);
  const scratchModalRef = useRef(null);
  const scratchCanvasRef = useRef(null);
  const scratchCardRef = useRef(null);
  const scratchPointerActiveRef = useRef(false);
  const scratchLastPointRef = useRef(null);
  const scratchRevealRef = useRef(false);
  const scratchCheckFrameRef = useRef(0);
  const entryRevealTimerRef = useRef(0);
  const cartNoticeTimerRef = useRef(0);

  useEffect(() => {
    try {
      setCart(parseStoredCart(localStorage.getItem(CART_KEY)));
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(ENTRY_UNLOCKED_KEY) === "1") {
        setEntryUnlocked(true);
        setEntryGateVisible(false);
        setOwnerAccessOpen(false);
      }
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
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      setCart([]);
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
    setScratchcardOpen(true);
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
    if (!scratchcardOpen || !scratchRevealed) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      scratchModalRef.current?.scrollTo({
        top: scratchModalRef.current.scrollHeight,
        behavior: "smooth"
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [scratchcardOpen, scratchRevealed]);

  useEffect(() => {
    return () => {
      if (entryRevealTimerRef.current) {
        window.clearTimeout(entryRevealTimerRef.current);
      }
      if (cartNoticeTimerRef.current) {
        window.clearTimeout(cartNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mailChooserOpen) {
      return undefined;
    }

    function handleMailChooserKeydown(event) {
      if (event.key === "Escape") {
        setMailChooserOpen(false);
      }
    }

    window.addEventListener("keydown", handleMailChooserKeydown);
    return () => {
      window.removeEventListener("keydown", handleMailChooserKeydown);
    };
  }, [mailChooserOpen]);

  const cartQuantity = useMemo(() => {
    return getCartQuantity(cart);
  }, [cart]);

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

  function showCartNotice(message) {
    setCartNoticeText(message);
    setCartNoticeVisible(true);

    if (cartNoticeTimerRef.current) {
      window.clearTimeout(cartNoticeTimerRef.current);
    }

    cartNoticeTimerRef.current = window.setTimeout(() => {
      setCartNoticeVisible(false);
      cartNoticeTimerRef.current = 0;
    }, 4200);
  }

  function addToCart() {
    if (!selectedSize) {
      setCheckoutState("error");
      setCheckoutMessage("Select a size before adding to cart.");
      return;
    }

    setCart(function (current) {
      return addCartItem(current, {
        size: selectedSize,
        quantity: selectedQuantity
      });
    });
    setCheckoutState("");
    setCheckoutMessage("");
    showCartNotice(`${showcaseProductName} (${selectedSize}) added to cart`);
  }

  async function handleWaitlistSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim().toLowerCase();

    if (!validateEmail(email)) {
      setWaitlistState("error");
      setWaitlistMessage("Please enter a valid email address.");
      return;
    }

    try {
      const response = await fetch("/api/discount-claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          email,
          source: "waitlist",
          reward: "10% off"
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Waitlist endpoint rejected request.");
      }

      setWaitlistState("success");
      setWaitlistMessage(
        payload.status === "exists"
          ? "That email is already on the waitlist. Check your inbox for your discount code."
          : "Thanks for joining the waitlist. Your 10% off code is already in your inbox."
      );
      event.currentTarget.reset();
      return;
    } catch (error) {
      setWaitlistState("error");
      setWaitlistMessage(
        error instanceof Error && error.message
          ? error.message
          : "We could not send your discount code right now. Please try again in a moment."
      );
    }
  }

  async function handleDiscountClaimSubmit(event) {
    event.preventDefault();

    const normalized = discountEmail.trim().toLowerCase();
    if (!validateEmail(normalized)) {
      setDiscountClaimState("error");
      setDiscountClaimMessage("Please enter a valid email address.");
      return;
    }

    try {
      const response = await fetch("/api/discount-claims", {
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

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Discount claim endpoint rejected request.");
      }

      setDiscountClaimState("success");
      setDiscountClaimMessage(
        payload.status === "exists"
          ? "That email already has a 10% code. Check your inbox."
          : "Thanks for joining the waitlist. Your 10% off code is already in your inbox."
      );
      setDiscountEmail("");
      return;
    } catch (error) {
      setDiscountClaimState("error");
      setDiscountClaimMessage(
        error instanceof Error && error.message
          ? error.message
          : "We could not send your discount code right now. Please try again in a moment."
      );
    }
  }

  function handleOwnerAccessSubmit(event) {
    event.preventDefault();

    if (ownerPin.trim() === OWNER_PIN) {
      if (entryRevealTimerRef.current) {
        window.clearTimeout(entryRevealTimerRef.current);
      }
      try {
        sessionStorage.setItem(ENTRY_UNLOCKED_KEY, "1");
      } catch {
        // Ignore storage failures and still unlock the storefront.
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

  function openScratchcard() {
    setScratchcardOpen(true);
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function openCartPage() {
    setCartNoticeVisible(false);
    router.push("/cart");
  }

  function openMailChooser() {
    setMailChooserOpen(true);
  }

  function closeMailChooser() {
    setMailChooserOpen(false);
  }

  function openMailDestination(destination) {
    if (destination === "gmail") {
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}`, "_blank", "noopener,noreferrer");
      closeMailChooser();
      return;
    }

    if (destination === "outlook") {
      window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(CONTACT_EMAIL)}`, "_blank", "noopener,noreferrer");
      closeMailChooser();
      return;
    }

    window.location.href = `mailto:${CONTACT_EMAIL}`;
    closeMailChooser();
  }

  const scratchcardModal = scratchcardOpen ? (
    <div className="scratchcard-overlay" role="dialog" aria-modal="true" aria-labelledby="scratchcardTitle">
      <div ref={scratchModalRef} className="scratchcard-modal">
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
            <p className="scratchcard-note">Scratch with your finger or mouse. Your 10% code is emailed immediately after you claim it.</p>
            <p className={`inline-message ${discountClaimState}`}>{discountClaimMessage}</p>
          </form>
        </div>
      </div>
    </div>
  ) : null;

  const cartNotice = (
    <button
      className={`cart-notice ${cartNoticeVisible ? "is-visible" : ""}`}
      type="button"
      onClick={openCartPage}
      aria-hidden={!cartNoticeVisible}
      tabIndex={cartNoticeVisible ? 0 : -1}
    >
      <span className="cart-notice-kicker">Added to cart</span>
      <span className="cart-notice-copy">{cartNoticeText || "Open cart"}</span>
      <span className="cart-notice-link" aria-hidden="true">Open cart -&gt;</span>
    </button>
  );

  const mailChooserModal = mailChooserOpen ? (
    <div
      className="mail-chooser-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mailChooserTitle"
      onClick={closeMailChooser}
    >
      <div className="mail-chooser-modal" onClick={(event) => event.stopPropagation()}>
        <button className="mail-chooser-close" type="button" onClick={closeMailChooser}>
          Close
        </button>
        <p className="mail-chooser-kicker">Email us</p>
        <h2 id="mailChooserTitle">Choose where to open your message.</h2>
        <p className="mail-chooser-copy">{CONTACT_EMAIL}</p>
        <div className="mail-chooser-actions">
          <button className="mail-chooser-option" type="button" onClick={() => openMailDestination("gmail")}>
            Open Gmail
          </button>
          <button className="mail-chooser-option" type="button" onClick={() => openMailDestination("outlook")}>
            Open Outlook
          </button>
          <button className="mail-chooser-option is-secondary" type="button" onClick={() => openMailDestination("other")}>
            Other mail app
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const discountCornerPrompt = entryUnlocked && !scratchcardOpen ? (
    <button className="discount-corner-prompt" type="button" onClick={openScratchcard}>
      <span className="discount-corner-kicker">Offer</span>
      <span className="discount-corner-copy">Claim 10% off</span>
    </button>
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
      {mailChooserModal}
      {scratchcardModal}
      {discountCornerPrompt}
      {cartNotice}
      <div className={`storefront-shell ${entryUnlocked ? "is-visible" : ""}`} aria-hidden={!entryUnlocked}>
        <main className="rebuild-site" id="top">
          <section className="brand-banner" aria-label="Site banner">
            <div className="brand-banner-wordmark-wrap">
              <img
                className="brand-banner-logo"
                src="/LogoRotate.gif"
                alt="thewolcollective"
              />
            </div>
            <div className="brand-banner-actions" aria-label="Banner actions">
              <Link className="brand-banner-cart" href="/cart" aria-label={`Cart (${cartQuantity})`}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="19" r="1.55" />
                  <circle cx="17" cy="19" r="1.55" />
                  <path d="M3 4H5.2L7.1 14H18.2L20.1 7.5H8.1" />
                </svg>
                <span>Cart ({cartQuantity})</span>
              </Link>
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
                          onClick={() => {
                            setSelectedSize(size);
                            setCheckoutState("");
                            setCheckoutMessage("");
                          }}
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

                {checkoutState === "error" ? <p className={`inline-message ${checkoutState}`}>{checkoutMessage}</p> : null}
              </article>
            </div>
          </section>
          <footer className="brand-footer" aria-label="Site footer">
            <div className="brand-footer-grid">
              <div className="brand-footer-wordmark-slot">
                <img
                  className="brand-footer-logo"
                  src="/CHROME LOGO.png"
                  alt="thewolcollective"
                />
              </div>
              <div className="brand-footer-column brand-footer-column-info">
                <h2>Information</h2>
                <Link href="/about">About us</Link>
                <Link href="/privacy-policy">Privacy policy</Link>
                <Link href="/shipping-policy">Shipping policy</Link>
                <Link href="/terms-of-service">Terms of service</Link>
                <div className="brand-footer-socials" aria-label="Social links">
                  <a
                    className="brand-footer-social brand-footer-social-instagram"
                    href="https://www.instagram.com/thewolcollective/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                  >
                    <svg className="brand-footer-social-icon brand-footer-social-icon-instagram" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4.8" />
                      <circle cx="12" cy="12" r="4.1" />
                      <circle cx="17.45" cy="6.55" r="1.05" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                  <button className="brand-footer-social" type="button" onClick={openMailChooser} aria-label="Email">
                    <svg className="brand-footer-social-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
                      <path d="M4.5 8L12 13.5L19.5 8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="brand-footer-meta">
              <div className="brand-footer-meta-copy">
                <p className="brand-footer-copyright">Copyright {new Date().getFullYear()} THEWOLCOLLECTIVE</p>
                <p className="brand-footer-builder">Built by Ekpo Software Solutions (praiseekpo2@gmail.com)</p>
              </div>
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
