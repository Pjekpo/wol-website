function ensureAuthenticated() {
  return fetch("/api/site-content").then(function (response) {
    if (!response.ok) {
      window.location.assign("/");
      return null;
    }
    return response.json();
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function renderChips(chips) {
  const row = document.getElementById("heroChips");
  row.innerHTML = "";
  chips.forEach(function (chipText) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = chipText;
    row.appendChild(chip);
  });
}

function renderLookbook(items) {
  const grid = document.getElementById("lookbookGrid");
  grid.innerHTML = "";

  items.forEach(function (item) {
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

  items.forEach(function (item) {
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
  renderChips(content.hero.chips || []);
  renderLookbook(content.lookbook || []);
  renderConcepts(content.concepts || []);
}

async function logout() {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.assign("/");
}

document.getElementById("logoutButton").addEventListener("click", logout);

ensureAuthenticated().then(function (payload) {
  if (payload && payload.content) {
    renderContent(payload.content);
  }
});
