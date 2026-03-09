const CART_KEY = "wol_collective_cart";
const WAITLIST_KEY = "wol_collective_waitlist";

const state = {
  content: null,
  cartQuantity: 0,
  selectedQuantity: 1
};

function currencyFormatter(currency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP"
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function setHtmlVisibility(id, hidden) {
  const element = document.getElementById(id);
  if (element) {
    element.hidden = hidden;
  }
}

function setInlineMessage(id, text, type) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  element.textContent = text;
  element.className = "inline-message" + (type ? " " + type : "");
}

function showStatusBanner(text, type) {
  const banner = document.getElementById("statusBanner");
  banner.hidden = false;
  banner.textContent = text;
  banner.className = "status-banner " + type;
}

function clearStatusBanner() {
  const banner = document.getElementById("statusBanner");
  banner.hidden = true;
  banner.textContent = "";
  banner.className = "status-banner";
}

function loadCartQuantity() {
  const raw = localStorage.getItem(CART_KEY);
  const quantity = Number(raw || "0");
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

function saveCartQuantity(quantity) {
  if (quantity <= 0) {
    localStorage.removeItem(CART_KEY);
    state.cartQuantity = 0;
    return;
  }
  localStorage.setItem(CART_KEY, String(quantity));
  state.cartQuantity = quantity;
}

function loadWaitlistEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveWaitlistEntry(email) {
  const entries = loadWaitlistEntries();
  const normalized = email.toLowerCase();
  const exists = entries.some(function (entry) {
    return entry.email === normalized;
  });

  if (exists) {
    return "exists";
  }

  entries.unshift({ email: normalized, createdAt: new Date().toISOString() });
  localStorage.setItem(WAITLIST_KEY, JSON.stringify(entries));
  return "saved";
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function renderChips(chips) {
  const row = document.getElementById("heroChips");
  row.innerHTML = "";
  (chips || []).forEach(function (chipText) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = chipText;
    row.appendChild(chip);
  });
}

function renderLookbook(items) {
  const grid = document.getElementById("lookbookGrid");
  grid.innerHTML = "";

  (items || []).forEach(function (item) {
    const card = document.createElement("article");
    card.className = "lookbook-card";

    const image = document.createElement("div");
    image.className = "lookbook-image";
    image.style.backgroundImage = "url(\"" + item.image + "\")";

    const copy = document.createElement("div");
    copy.className = "lookbook-copy";

    const label = document.createElement("p");
    label.className = "section-label";
    label.textContent = item.label;

    const title = document.createElement("h3");
    title.textContent = item.title;

    copy.appendChild(label);
    copy.appendChild(title);
    card.appendChild(image);
    card.appendChild(copy);
    grid.appendChild(card);
  });
}

function renderConcepts(items) {
  const grid = document.getElementById("conceptGrid");
  grid.innerHTML = "";

  (items || []).forEach(function (item) {
    const card = document.createElement("article");
    card.className = "concept-card";

    const title = document.createElement("h3");
    title.textContent = item.title;

    const body = document.createElement("p");
    body.textContent = item.body;

    card.appendChild(title);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

function renderSelectedQuantity() {
  setText("selectedQty", String(state.selectedQuantity));
}

function renderCart() {
  const product = state.content.product;
  const formatter = currencyFormatter(product.currency);
  const quantity = state.cartQuantity;
  const total = quantity * product.price;

  setText("cartCount", String(quantity));
  setText("cartQty", String(quantity));
  setText("cartProductName", product.name);
  setText("cartProductMeta", product.priceLabel + " each");
  setText("cartLineTotal", formatter.format(total));
  setText("cartSubtotal", formatter.format(total));

  setHtmlVisibility("cartEmpty", quantity > 0);
  setHtmlVisibility("cartContent", quantity === 0);
}

function renderContent(content) {
  state.content = content;
  setText("navTagline", content.brand.navTagline);
  setText("heroBadge", content.brand.badge);
  setText("heroLine0", content.hero.headline[0]);
  setText("heroLine1", content.hero.headline[1]);
  setText("heroLine2", content.hero.headline[2]);
  setText("heroTitle", content.hero.title);
  setText("heroText", content.hero.text);
  setText("manifestoHeading", content.manifesto.heading);
  setText("manifestoBody", content.manifesto.body);
  setText("productName", content.product.name);
  setText("productDescription", content.product.description);
  setText("productStory", content.product.story);
  setText("productPrice", content.product.priceLabel);
  setText("productSizes", content.product.sizes);
  setText("waitlistTitle", content.waitlist.title);
  setText("waitlistBody", content.waitlist.body);
  setText("waitlistButton", content.waitlist.button);
  setText("waitlistNote", content.waitlist.note);

  document.getElementById("productImage").style.backgroundImage = "url(\"" + content.product.image + "\")";
  renderChips(content.hero.chips);
  renderLookbook(content.lookbook);
  renderConcepts(content.concepts);
  renderCart();
}

async function loadContent() {
  const response = await fetch("/data/content.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load content.");
  }
  const content = await response.json();
  renderContent(content);
}

function updateSelectedQuantity(delta) {
  state.selectedQuantity = Math.max(1, Math.min(10, state.selectedQuantity + delta));
  renderSelectedQuantity();
}

function updateCartQuantity(nextQuantity) {
  saveCartQuantity(Math.max(0, Math.min(10, nextQuantity)));
  renderCart();
}

function openCart() {
  document.getElementById("cartDrawer").classList.add("is-open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "false");
  setHtmlVisibility("cartOverlay", false);
}

function closeCart() {
  document.getElementById("cartDrawer").classList.remove("is-open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "true");
  setHtmlVisibility("cartOverlay", true);
}

function addToCart() {
  updateCartQuantity(state.cartQuantity + state.selectedQuantity);
  setInlineMessage("checkoutMessage", "Added to cart.", "success");
  openCart();
}

async function startCheckout(quantity) {
  if (!state.content) {
    return;
  }

  setInlineMessage("checkoutMessage", "Creating secure checkout...", "success");

  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ quantity: quantity, slug: state.content.product.slug })
  });

  const payload = await response.json();

  if (!response.ok) {
    setInlineMessage("checkoutMessage", payload.error || "Unable to start checkout.", "error");
    return;
  }

  window.location.assign(payload.url);
}

function handleBuyNow() {
  updateCartQuantity(state.selectedQuantity);
  openCart();
  startCheckout(state.selectedQuantity).catch(function () {
    setInlineMessage("checkoutMessage", "Checkout failed. Configure Stripe in Vercel and try again.", "error");
  });
}

function handleCheckoutFromCart() {
  if (state.cartQuantity <= 0) {
    setInlineMessage("checkoutMessage", "Add the product to your cart first.", "error");
    return;
  }

  startCheckout(state.cartQuantity).catch(function () {
    setInlineMessage("checkoutMessage", "Checkout failed. Configure Stripe in Vercel and try again.", "error");
  });
}

async function submitWaitlist(event) {
  event.preventDefault();
  const input = document.getElementById("waitlistEmail");
  const email = input.value.trim();
  const endpoint = state.content.waitlist.endpoint || "";

  if (!validateEmail(email)) {
    setInlineMessage("waitlistMessage", "Please enter a valid email address.", "error");
    return;
  }

  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email: email })
      });

      if (!response.ok) {
        throw new Error("Endpoint rejected request.");
      }

      setInlineMessage("waitlistMessage", "You are on the waitlist.", "success");
      input.value = "";
      return;
    } catch (error) {
      setInlineMessage("waitlistMessage", "External form failed, so the email was saved only in this browser.", "error");
    }
  }

  const status = saveWaitlistEntry(email);
  if (status === "exists") {
    setInlineMessage("waitlistMessage", "This email is already saved in this browser.", "success");
    return;
  }

  setInlineMessage("waitlistMessage", "Email saved in this browser.", "success");
  input.value = "";
}

function handleQueryState() {
  const params = new URLSearchParams(window.location.search);
  const checkout = params.get("checkout");

  if (checkout === "success") {
    saveCartQuantity(0);
    renderCart();
    showStatusBanner("Payment complete. Stripe sent the order back successfully.", "success");
  } else if (checkout === "cancel") {
    showStatusBanner("Checkout was cancelled. Your cart is still here.", "error");
  } else {
    clearStatusBanner();
  }
}

function attachEvents() {
  document.getElementById("increaseQty").addEventListener("click", function () {
    updateSelectedQuantity(1);
  });
  document.getElementById("decreaseQty").addEventListener("click", function () {
    updateSelectedQuantity(-1);
  });
  document.getElementById("addToCartButton").addEventListener("click", addToCart);
  document.getElementById("buyNowButton").addEventListener("click", handleBuyNow);
  document.getElementById("cartButton").addEventListener("click", openCart);
  document.getElementById("closeCartButton").addEventListener("click", closeCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);
  document.getElementById("cartIncreaseQty").addEventListener("click", function () {
    updateCartQuantity(state.cartQuantity + 1);
  });
  document.getElementById("cartDecreaseQty").addEventListener("click", function () {
    updateCartQuantity(state.cartQuantity - 1);
  });
  document.getElementById("checkoutButton").addEventListener("click", handleCheckoutFromCart);
  document.getElementById("waitlistForm").addEventListener("submit", submitWaitlist);
}

state.cartQuantity = loadCartQuantity();
renderSelectedQuantity();
attachEvents();
loadContent().then(handleQueryState).catch(function (error) {
  showStatusBanner(error.message || "Could not load store content.", "error");
});
