const OWNER_PASSWORD = "1234";
const ACCESS_KEY = "wol_collective_github_pages_access";
const WAITLIST_KEY = "wol_collective_github_pages_waitlist";

function setMessage(id, text, type) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  element.textContent = text;
  element.className = "message" + (type ? " " + type : "");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
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

  entries.unshift({
    email: normalized,
    createdAt: new Date().toISOString()
  });
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

function renderContent(content) {
  setText("gateBadge", content.brand.badge);
  setText("gateIntro", content.gate.intro);
  setText("gateQuote", content.brand.quote);
  setText("gateTitle", content.gate.title);
  setText("gateBody", content.gate.body);
  setText("waitlistLabel", content.gate.waitlistLabel);
  setText("waitlistNote", content.gate.waitlistNote);
  setText("waitlistFallback", content.gate.waitlistFallback || "");
  setText("ownerPrompt", content.gate.ownerPrompt);
  setText("navTagline", content.brand.navTagline);
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
  setText("productPrice", content.product.price);
  setText("productSizes", content.product.sizes);
  setText("footerLeft", content.footer.left);
  setText("footerRight", content.footer.right);

  document.getElementById("productImage").style.backgroundImage = "url(\"" + content.product.image + "\")";
  renderChips(content.hero.chips);
  renderLookbook(content.lookbook);
  renderConcepts(content.concepts);

  window.wolWaitlistEndpoint = content.gate.waitlistEndpoint || "";
}

async function loadContent() {
  const response = await fetch("./data/content.json", { cache: "no-store" });
  const content = await response.json();
  renderContent(content);
}

function unlockSite() {
  localStorage.setItem(ACCESS_KEY, "granted");
  document.getElementById("gate").classList.add("is-hidden");
  document.getElementById("site").classList.remove("is-locked");
}

function lockSite() {
  localStorage.removeItem(ACCESS_KEY);
  document.getElementById("gate").classList.remove("is-hidden");
  document.getElementById("site").classList.add("is-locked");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function submitWaitlist(event) {
  event.preventDefault();
  const emailInput = document.getElementById("waitlistEmail");
  const email = emailInput.value.trim();

  if (!validateEmail(email)) {
    setMessage("waitlistMessage", "Please enter a valid email address.", "error");
    return;
  }

  const endpoint = window.wolWaitlistEndpoint || "";

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
        throw new Error("Form endpoint rejected the request.");
      }

      setMessage("waitlistMessage", "Email saved for the 10% drop code.", "success");
      emailInput.value = "";
      return;
    } catch (error) {
      setMessage("waitlistMessage", "External form failed, so the email was saved only in this browser.", "error");
    }
  }

  const status = saveWaitlistEntry(email);
  if (status === "exists") {
    setMessage("waitlistMessage", "This email is already saved in this browser.", "success");
    return;
  }

  setMessage("waitlistMessage", "Email saved in this browser for launch reminders.", "success");
  emailInput.value = "";
}

function submitOwnerLogin(event) {
  event.preventDefault();
  const password = document.getElementById("ownerPassword").value.trim();

  if (password !== OWNER_PASSWORD) {
    setMessage("loginMessage", "Incorrect password. Try again.", "error");
    return;
  }

  setMessage("loginMessage", "Access granted. Opening site...", "success");
  unlockSite();
}

function restoreAccess() {
  if (localStorage.getItem(ACCESS_KEY) === "granted") {
    unlockSite();
  }
}

function focusWaitlist() {
  document.getElementById("gate").classList.remove("is-hidden");
  document.getElementById("site").classList.add("is-locked");
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(function () {
    document.getElementById("waitlistEmail").focus();
  }, 180);
}

document.getElementById("waitlistForm").addEventListener("submit", submitWaitlist);
document.getElementById("loginForm").addEventListener("submit", submitOwnerLogin);
document.getElementById("lockButton").addEventListener("click", lockSite);
document.getElementById("joinWaitlistButton").addEventListener("click", focusWaitlist);

loadContent().then(restoreAccess).catch(function () {
  setMessage("waitlistMessage", "Could not load site content. Check the JSON file path.", "error");
});
