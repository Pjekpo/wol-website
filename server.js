const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const VIEW_DIR = path.join(ROOT_DIR, "views");
const DATA_DIR = path.join(ROOT_DIR, "data");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");
const WAITLIST_FILE = path.join(DATA_DIR, "waitlist.json");
const SESSION_COOKIE = "wol_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ADMIN_PASSWORD = process.env.WOL_ADMIN_PASSWORD || "1234";

const DEFAULT_CONTENT = {
  brand: {
    name: "The WOL Collective",
    navTagline: "By us. For us. Against what was built to erase us.",
    badge: "Community Access Required",
    quote: "\"Style as protest. Fabric as memory. Movement as design.\""
  },
  gate: {
    title: "Unlock the first drop",
    intro: "Built for Black voices, Black futures, and everyone committed to breaking old systems.",
    body: "Enter your email for a 10% launch code and join the drop list before release.",
    ownerPrompt: "Are you the owner of The WOL Collective? Input password here.",
    waitlistLabel: "Email for 10% off at drop",
    waitlistNote: "Drop code is sent when collection goes live."
  },
  hero: {
    headline: ["Rewrite", "The", "System"],
    title: "One product. One message. No silence.",
    text: "The WOL Collective is an Afro-centred clothing project building garments around memory, resistance, and cultural authorship. The first drop stays intentionally focused: one statement piece, one clear voice.",
    chips: ["Drop 001", "Owner Access Only", "Afro-Centred Design"]
  },
  manifesto: {
    heading: "A uniform for memory, resistance, and belonging.",
    body: "WOL is designed around the idea that clothing can carry witness. Every line, every seam, every silhouette is treated as a record of pressure, survival, and presence."
  },
  product: {
    name: "Product 001: The System Breaker Overshirt",
    price: "GBP 120.00",
    sizes: "XS / S / M / L / XL",
    description: "A heavyweight black overshirt cut with calm structure, contrast seam mapping, and a clean silhouette intended to feel ceremonial without losing street function.",
    story: "Built as a single-anchor release, the overshirt is meant to be worn as an everyday uniform. It balances restraint and defiance: soft drape, firm shoulders, and a message carried through proportion rather than noise.",
    image: "https://images.pexels.com/photos/20418504/pexels-photo-20418504.jpeg?auto=compress&cs=tinysrgb&w=1400"
  },
  lookbook: [
    {
      label: "Campaign 01",
      title: "Soft power. Hard lines.",
      image: "https://images.pexels.com/photos/20418504/pexels-photo-20418504.jpeg?auto=compress&cs=tinysrgb&w=900"
    },
    {
      label: "Campaign 02",
      title: "Built for witness.",
      image: "https://images.pexels.com/photos/9558590/pexels-photo-9558590.jpeg?auto=compress&cs=tinysrgb&w=900"
    },
    {
      label: "Campaign 03",
      title: "Presence as language.",
      image: "https://images.pexels.com/photos/7691234/pexels-photo-7691234.jpeg?auto=compress&cs=tinysrgb&w=900"
    }
  ],
  concepts: [
    {
      title: "Courtline Quilting",
      body: "Stitch paths echo the legal routes communities are forced to navigate, with hidden interior map lines appearing only at close range."
    },
    {
      title: "Noiseprint Denim",
      body: "Fabric surface patterns derived from chant rhythm and public gathering audio, converted into raised tonal textures."
    },
    {
      title: "Archive Hem",
      body: "Each hem carries stitched date markers referencing moments of refusal, assembly, and collective care."
    }
  ],
  footer: {
    left: "The WOL Collective",
    right: "Access is intentional. Culture is non-negotiable."
  }
};

const sessions = new Map();

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONTENT_FILE)) {
    writeJson(CONTENT_FILE, DEFAULT_CONTENT);
  }
  if (!fs.existsSync(WAITLIST_FILE)) {
    writeJson(WAITLIST_FILE, []);
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function sendJson(response, statusCode, payload, extraHeaders) {
  response.writeHead(
    statusCode,
    Object.assign(
      {
        "Content-Type": "application/json; charset=utf-8"
      },
      extraHeaders || {}
    )
  );
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text, extraHeaders) {
  response.writeHead(
    statusCode,
    Object.assign(
      {
        "Content-Type": "text/plain; charset=utf-8"
      },
      extraHeaders || {}
    )
  );
  response.end(text);
}

function sendView(response, fileName) {
  const viewPath = path.join(VIEW_DIR, fileName);
  try {
    const markup = fs.readFileSync(viewPath, "utf8");
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(markup);
  } catch (error) {
    sendText(response, 500, "View not found.");
  }
}

function parseCookies(request) {
  const header = request.headers.cookie || "";
  const cookiePairs = header
    .split(";")
    .map(function (part) {
      return part.trim();
    })
    .filter(Boolean);
  const cookies = {};

  cookiePairs.forEach(function (pair) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) {
      return;
    }
    const key = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
  });

  return cookies;
}

function cleanSessions() {
  const now = Date.now();
  Array.from(sessions.entries()).forEach(function (entry) {
    const token = entry[0];
    const session = entry[1];
    if (!session || now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(token);
    }
  });
}

function getSessionToken(request) {
  cleanSessions();
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token || !sessions.has(token)) {
    return "";
  }
  return token;
}

function isAuthenticated(request) {
  return Boolean(getSessionToken(request));
}

function createSession(response) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { createdAt: Date.now() });
  const cookie = SESSION_COOKIE + "=" + token + "; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800";
  response.setHeader("Set-Cookie", cookie);
}

function destroySession(request, response) {
  const token = getSessionToken(request);
  if (token) {
    sessions.delete(token);
  }
  response.setHeader("Set-Cookie", SESSION_COOKIE + "=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
}

function parseBody(request) {
  return new Promise(function (resolve, reject) {
    let raw = "";

    request.on("data", function (chunk) {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request too large"));
        request.destroy();
      }
    });

    request.on("end", function () {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });

    request.on("error", reject);
  });
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function serveStatic(response, requestPath) {
  const normalizedPath = path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(PUBLIC_DIR, normalizedPath);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(path.resolve(PUBLIC_DIR))) {
    sendText(response, 403, "Forbidden");
    return;
  }

  fs.readFile(resolvedPath, function (error, fileBuffer) {
    if (error) {
      sendText(response, 404, "Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": getMimeType(resolvedPath) });
    response.end(fileBuffer);
  });
}

function unauthorized(response) {
  sendJson(response, 401, { ok: false, error: "Unauthorized" });
}

function getContent() {
  return readJson(CONTENT_FILE, DEFAULT_CONTENT);
}

function getWaitlist() {
  const entries = readJson(WAITLIST_FILE, []);
  return Array.isArray(entries) ? entries : [];
}

function trimString(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
}

function updateContent(current, incoming) {
  const next = JSON.parse(JSON.stringify(current));

  if (incoming.brand) {
    next.brand.navTagline = trimString(incoming.brand.navTagline, 160) || next.brand.navTagline;
    next.brand.quote = trimString(incoming.brand.quote, 220) || next.brand.quote;
  }

  if (incoming.hero) {
    next.hero.title = trimString(incoming.hero.title, 140) || next.hero.title;
    next.hero.text = trimString(incoming.hero.text, 500) || next.hero.text;
  }

  if (incoming.manifesto) {
    next.manifesto.heading = trimString(incoming.manifesto.heading, 160) || next.manifesto.heading;
    next.manifesto.body = trimString(incoming.manifesto.body, 500) || next.manifesto.body;
  }

  if (incoming.product) {
    next.product.name = trimString(incoming.product.name, 140) || next.product.name;
    next.product.price = trimString(incoming.product.price, 60) || next.product.price;
    next.product.sizes = trimString(incoming.product.sizes, 120) || next.product.sizes;
    next.product.description = trimString(incoming.product.description, 500) || next.product.description;
    next.product.story = trimString(incoming.product.story, 600) || next.product.story;
    next.product.image = trimString(incoming.product.image, 500) || next.product.image;
  }

  return next;
}

ensureDataFiles();

const server = http.createServer(async function (request, response) {
  const url = new URL(request.url, "http://localhost:" + PORT);
  const pathname = url.pathname;

  try {
    if (request.method === "GET" && pathname === "/") {
      sendView(response, isAuthenticated(request) ? "site.html" : "gate.html");
      return;
    }

    if (request.method === "GET" && pathname === "/admin") {
      sendView(response, "admin.html");
      return;
    }

    if (request.method === "GET" && pathname === "/api/session") {
      sendJson(response, 200, { authenticated: isAuthenticated(request) });
      return;
    }

    if (request.method === "GET" && pathname === "/api/public-content") {
      const content = getContent();
      sendJson(response, 200, {
        brand: content.brand,
        gate: content.gate
      });
      return;
    }

    if (request.method === "GET" && pathname === "/api/site-content") {
      if (!isAuthenticated(request)) {
        unauthorized(response);
        return;
      }
      sendJson(response, 200, { ok: true, content: getContent() });
      return;
    }

    if (request.method === "POST" && pathname === "/api/waitlist") {
      const body = await parseBody(request);
      const email = trimString(body.email, 180).toLowerCase();

      if (!isValidEmail(email)) {
        sendJson(response, 400, { ok: false, error: "Please enter a valid email address." });
        return;
      }

      const waitlist = getWaitlist();
      const existing = waitlist.find(function (entry) {
        return entry.email === email;
      });

      if (existing) {
        sendJson(response, 200, {
          ok: true,
          status: "exists",
          message: "This email is already on the waitlist."
        });
        return;
      }

      waitlist.unshift({
        email: email,
        createdAt: new Date().toISOString()
      });
      writeJson(WAITLIST_FILE, waitlist);

      sendJson(response, 201, {
        ok: true,
        status: "saved",
        message: "Email saved for the 10% drop code."
      });
      return;
    }

    if (request.method === "POST" && pathname === "/api/admin/login") {
      const body = await parseBody(request);
      const password = trimString(body.password, 100);

      if (password !== ADMIN_PASSWORD) {
        sendJson(response, 401, { ok: false, error: "Incorrect password." });
        return;
      }

      createSession(response);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && pathname === "/api/admin/logout") {
      destroySession(request, response);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && pathname === "/api/admin/waitlist") {
      if (!isAuthenticated(request)) {
        unauthorized(response);
        return;
      }
      sendJson(response, 200, { ok: true, entries: getWaitlist() });
      return;
    }

    if (request.method === "GET" && pathname === "/api/admin/content") {
      if (!isAuthenticated(request)) {
        unauthorized(response);
        return;
      }
      sendJson(response, 200, { ok: true, content: getContent() });
      return;
    }

    if (request.method === "PUT" && pathname === "/api/admin/content") {
      if (!isAuthenticated(request)) {
        unauthorized(response);
        return;
      }

      const body = await parseBody(request);
      const next = updateContent(getContent(), body);
      writeJson(CONTENT_FILE, next);
      sendJson(response, 200, { ok: true, content: next, message: "Content updated." });
      return;
    }

    if (request.method === "GET" && pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET") {
      const staticPath = pathname.replace(/^\/+/, "");
      if (staticPath) {
        serveStatic(response, staticPath);
        return;
      }
    }

    sendText(response, 404, "Not found");
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error && error.message ? error.message : "Server error"
    });
  }
});

server.listen(PORT, function () {
  console.log("The WOL Collective server running at http://localhost:" + PORT);
});
