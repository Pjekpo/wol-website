function setMessage(element, text, type) {
  element.textContent = text;
  element.className = "message" + (type ? " " + type : "");
}

async function loadGateCopy() {
  const response = await fetch("/api/public-content");
  const payload = await response.json();

  if (!payload || !payload.brand || !payload.gate) {
    return;
  }

  document.getElementById("gateBadge").textContent = payload.brand.badge;
  document.getElementById("gateIntro").textContent = payload.gate.intro;
  document.getElementById("gateQuote").textContent = payload.brand.quote;
  document.getElementById("gateTitle").textContent = payload.gate.title;
  document.getElementById("gateBody").textContent = payload.gate.body;
  document.getElementById("waitlistLabel").textContent = payload.gate.waitlistLabel;
  document.getElementById("waitlistNote").textContent = payload.gate.waitlistNote;
  document.getElementById("ownerPrompt").textContent = payload.gate.ownerPrompt;
}

async function submitWaitlist(event) {
  event.preventDefault();

  const emailInput = document.getElementById("waitlistEmail");
  const message = document.getElementById("waitlistMessage");
  const email = emailInput.value.trim();

  const response = await fetch("/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: email })
  });

  const payload = await response.json();

  if (!response.ok) {
    setMessage(message, payload.error || "Unable to save email.", "error");
    return;
  }

  setMessage(message, payload.message, payload.status === "saved" ? "success" : "");
  if (payload.status === "saved") {
    emailInput.value = "";
  }
}

async function ownerLogin(event) {
  event.preventDefault();

  const passwordInput = document.getElementById("ownerPassword");
  const message = document.getElementById("loginMessage");
  const password = passwordInput.value.trim();

  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password: password })
  });

  const payload = await response.json();

  if (!response.ok) {
    setMessage(message, payload.error || "Unable to log in.", "error");
    return;
  }

  setMessage(message, "Access granted. Opening site...", "success");
  window.location.assign("/");
}

document.getElementById("waitlistForm").addEventListener("submit", submitWaitlist);
document.getElementById("loginForm").addEventListener("submit", ownerLogin);

loadGateCopy().catch(function () {
  return null;
});
