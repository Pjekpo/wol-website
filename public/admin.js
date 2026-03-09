function setMessage(element, text, type) {
  element.textContent = text;
  element.className = "admin-message" + (type ? " " + type : "");
}

function formatDate(iso) {
  if (!iso) {
    return "Unknown";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function fillContentForm(content) {
  document.getElementById("navTaglineInput").value = content.brand.navTagline || "";
  document.getElementById("quoteInput").value = content.brand.quote || "";
  document.getElementById("heroTitleInput").value = content.hero.title || "";
  document.getElementById("heroTextInput").value = content.hero.text || "";
  document.getElementById("manifestoHeadingInput").value = content.manifesto.heading || "";
  document.getElementById("manifestoBodyInput").value = content.manifesto.body || "";
  document.getElementById("productNameInput").value = content.product.name || "";
  document.getElementById("productPriceInput").value = content.product.price || "";
  document.getElementById("productSizesInput").value = content.product.sizes || "";
  document.getElementById("productDescriptionInput").value = content.product.description || "";
  document.getElementById("productStoryInput").value = content.product.story || "";
  document.getElementById("productImageInput").value = content.product.image || "";
}

function renderWaitlist(entries) {
  const count = document.getElementById("waitlistCount");
  const latest = document.getElementById("latestSignup");
  const table = document.getElementById("waitlistTable");

  count.textContent = String(entries.length);
  latest.textContent = entries.length ? entries[0].email : "No entries yet";
  table.innerHTML = "";

  if (!entries.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.textContent = "No waitlist entries yet.";
    row.appendChild(cell);
    table.appendChild(row);
    return;
  }

  entries.forEach(function (entry) {
    const row = document.createElement("tr");
    const emailCell = document.createElement("td");
    const dateCell = document.createElement("td");

    emailCell.textContent = entry.email;
    dateCell.textContent = formatDate(entry.createdAt);

    row.appendChild(emailCell);
    row.appendChild(dateCell);
    table.appendChild(row);
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  return { response: response, payload: payload };
}

async function loadDashboard() {
  const [contentResult, waitlistResult] = await Promise.all([
    fetchJson("/api/admin/content"),
    fetchJson("/api/admin/waitlist")
  ]);

  if (!contentResult.response.ok || !waitlistResult.response.ok) {
    document.getElementById("adminAuth").classList.remove("hidden");
    document.getElementById("adminDashboard").classList.add("hidden");
    return;
  }

  document.getElementById("adminAuth").classList.add("hidden");
  document.getElementById("adminDashboard").classList.remove("hidden");
  fillContentForm(contentResult.payload.content);
  renderWaitlist(waitlistResult.payload.entries);
}

async function checkSession() {
  const result = await fetchJson("/api/session");
  if (result.payload.authenticated) {
    await loadDashboard();
  } else {
    document.getElementById("adminAuth").classList.remove("hidden");
    document.getElementById("adminDashboard").classList.add("hidden");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const message = document.getElementById("adminLoginMessage");
  const password = document.getElementById("adminPassword").value.trim();

  const result = await fetchJson("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password: password })
  });

  if (!result.response.ok) {
    setMessage(message, result.payload.error || "Unable to log in.", "error");
    return;
  }

  setMessage(message, "Access granted. Loading dashboard...", "success");
  await loadDashboard();
}

async function handleSave(event) {
  event.preventDefault();
  const message = document.getElementById("contentMessage");

  const payload = {
    brand: {
      navTagline: document.getElementById("navTaglineInput").value,
      quote: document.getElementById("quoteInput").value
    },
    hero: {
      title: document.getElementById("heroTitleInput").value,
      text: document.getElementById("heroTextInput").value
    },
    manifesto: {
      heading: document.getElementById("manifestoHeadingInput").value,
      body: document.getElementById("manifestoBodyInput").value
    },
    product: {
      name: document.getElementById("productNameInput").value,
      price: document.getElementById("productPriceInput").value,
      sizes: document.getElementById("productSizesInput").value,
      description: document.getElementById("productDescriptionInput").value,
      story: document.getElementById("productStoryInput").value,
      image: document.getElementById("productImageInput").value
    }
  };

  const result = await fetchJson("/api/admin/content", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!result.response.ok) {
    setMessage(message, result.payload.error || "Unable to save changes.", "error");
    return;
  }

  setMessage(message, result.payload.message || "Content updated.", "success");
  fillContentForm(result.payload.content);
}

async function handleLogout() {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.assign("/");
}

document.getElementById("adminLoginForm").addEventListener("submit", handleLogin);
document.getElementById("contentForm").addEventListener("submit", handleSave);
document.getElementById("adminLogout").addEventListener("click", handleLogout);
checkSession();
