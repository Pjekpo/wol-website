import { randomUUID } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
const LAUNCH_DISCOUNT_PERCENT = Number(process.env.LAUNCH_DISCOUNT_PERCENT || 10);
const LAUNCH_DISCOUNT_EXPIRY_ISO = process.env.LAUNCH_DISCOUNT_EXPIRY_ISO || "";

const DISCOUNT_CLAIMS_TABLE = "discount_claims";
const DISCOUNT_STATE_TABLE = "launch_discount_state";
const LAUNCH_COUPON_KEY = "launch_coupon_id";

function requireSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Discount storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function buildStoreUrl(pathname = "/") {
  if (SITE_URL) {
    return new URL(pathname, SITE_URL).toString();
  }

  return pathname;
}

function buildLaunchDiscountCode() {
  return `WOL-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function claimFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    email: String(row.email || ""),
    source: String(row.source || ""),
    reward: String(row.reward || ""),
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
    emailedAt: String(row.emailed_at || ""),
    discountCode: String(row.discount_code || ""),
    promotionCodeId: String(row.promotion_code_id || ""),
    couponId: String(row.coupon_id || ""),
    resendEmailId: String(row.resend_email_id || ""),
    lastError: String(row.last_error || "")
  };
}

function claimToRow(claim) {
  const now = new Date().toISOString();

  return {
    email: normalizeEmail(claim.email),
    source: String(claim.source || ""),
    reward: String(claim.reward || ""),
    created_at: claim.createdAt || now,
    updated_at: claim.updatedAt || now,
    emailed_at: claim.emailedAt || null,
    discount_code: claim.discountCode || null,
    promotion_code_id: claim.promotionCodeId || null,
    coupon_id: claim.couponId || null,
    resend_email_id: claim.resendEmailId || null,
    last_error: claim.lastError || null
  };
}

function buildSupabaseUrl(pathname, query = {}) {
  const url = new URL(`/rest/v1/${pathname}`, SUPABASE_URL);

  Object.entries(query).forEach(function ([key, value]) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function supabaseRequest(pathname, { method = "GET", query = {}, body, headers = {} } = {}) {
  requireSupabaseConfig();

  const response = await fetch(buildSupabaseUrl(pathname, query), {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });

  const responseText = await response.text();
  let payload = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (payload && typeof payload === "object" && (payload.message || payload.error?.message || payload.error || payload.details)) ||
      "Supabase request failed.";
    throw new Error(String(errorMessage));
  }

  return payload;
}

async function supabaseSelectOne(table, query) {
  const rows = await supabaseRequest(table, {
    query: {
      select: "*",
      limit: 1,
      ...query
    }
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function supabaseUpsert(table, row, onConflict) {
  const rows = await supabaseRequest(table, {
    method: "POST",
    query: onConflict ? { on_conflict: onConflict } : {},
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: row
  });

  return Array.isArray(rows) ? rows[0] || null : rows;
}

async function getStoredCouponId() {
  const row = await supabaseSelectOne(DISCOUNT_STATE_TABLE, {
    key: `eq.${LAUNCH_COUPON_KEY}`
  });

  return row && row.value ? String(row.value) : "";
}

async function setStoredCouponId(couponId) {
  await supabaseUpsert(
    DISCOUNT_STATE_TABLE,
    {
      key: LAUNCH_COUPON_KEY,
      value: couponId,
      updated_at: new Date().toISOString()
    },
    "key"
  );
}

async function getStoredClaim(email) {
  const row = await supabaseSelectOne(DISCOUNT_CLAIMS_TABLE, {
    email: `eq.${normalizeEmail(email)}`
  });

  return claimFromRow(row);
}

async function setStoredClaim(claim) {
  const row = await supabaseUpsert(DISCOUNT_CLAIMS_TABLE, claimToRow(claim), "email");
  return claimFromRow(row);
}

export function discountStorageConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

export function launchDiscountDispatchConfigured() {
  return Boolean(discountStorageConfigured() && STRIPE_SECRET_KEY && RESEND_API_KEY && RESEND_FROM_EMAIL);
}

export async function saveDiscountClaim({ email, source = "scratchcard", reward = "10% off" }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const existing = await getStoredClaim(normalizedEmail);
  if (existing) {
    return {
      created: false,
      claim: existing
    };
  }

  const now = new Date().toISOString();
  const claim = {
    email: normalizedEmail,
    source,
    reward,
    createdAt: now,
    updatedAt: now,
    emailedAt: "",
    discountCode: "",
    promotionCodeId: "",
    couponId: "",
    resendEmailId: "",
    lastError: ""
  };

  const storedClaim = await setStoredClaim(claim);

  return {
    created: true,
    claim: storedClaim || claim
  };
}

export async function listDiscountClaims() {
  const rows = await supabaseRequest(DISCOUNT_CLAIMS_TABLE, {
    query: {
      select: "*",
      order: "created_at.asc"
    }
  });

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(claimFromRow).filter(Boolean);
}

async function createStripeCoupon() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY.");
  }

  const params = new URLSearchParams();
  params.set("percent_off", String(LAUNCH_DISCOUNT_PERCENT));
  params.set("duration", "once");
  params.set("name", `WOL ${LAUNCH_DISCOUNT_PERCENT}% launch discount`);
  params.set("metadata[purpose]", "launch_discount");

  if (LAUNCH_DISCOUNT_EXPIRY_ISO) {
    const redeemBy = Math.floor(new Date(LAUNCH_DISCOUNT_EXPIRY_ISO).getTime() / 1000);
    if (Number.isFinite(redeemBy) && redeemBy > 0) {
      params.set("redeem_by", String(redeemBy));
    }
  }

  const response = await fetch("https://api.stripe.com/v1/coupons", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString(),
    cache: "no-store"
  });

  const payload = await response.json();
  if (!response.ok || !payload.id) {
    throw new Error(payload?.error?.message || "Failed to create Stripe coupon.");
  }

  return payload.id;
}

async function ensureLaunchCouponId() {
  const storedCouponId = await getStoredCouponId();
  if (storedCouponId) {
    return storedCouponId;
  }

  const createdCouponId = await createStripeCoupon();
  await setStoredCouponId(createdCouponId);
  return createdCouponId;
}

async function createPromotionCode({ email, couponId }) {
  const params = new URLSearchParams();
  const code = buildLaunchDiscountCode();

  params.set("promotion[type]", "coupon");
  params.set("promotion[coupon]", couponId);
  params.set("code", code);
  params.set("max_redemptions", "1");
  params.set("metadata[email]", email);

  if (LAUNCH_DISCOUNT_EXPIRY_ISO) {
    const expiresAt = Math.floor(new Date(LAUNCH_DISCOUNT_EXPIRY_ISO).getTime() / 1000);
    if (Number.isFinite(expiresAt) && expiresAt > 0) {
      params.set("expires_at", String(expiresAt));
    }
  }

  const response = await fetch("https://api.stripe.com/v1/promotion_codes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString(),
    cache: "no-store"
  });

  const payload = await response.json();
  if (!response.ok || !payload.id || !payload.code) {
    throw new Error(payload?.error?.message || "Failed to create Stripe promotion code.");
  }

  return {
    promotionCodeId: payload.id,
    discountCode: payload.code
  };
}

async function sendLaunchDiscountEmail({ email, discountCode }) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    throw new Error("Email sending is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

  const storeUrl = buildStoreUrl("/");
  const html = `
    <div style="background:#0a0a0a;color:#f6f2e8;padding:32px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 12px;color:#bda98e;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;">The WOL Collective</p>
      <h1 style="margin:0 0 16px;font-size:32px;line-height:1;">Thanks for joining the waitlist.</h1>
      <p style="margin:0 0 18px;color:#d7d0c5;line-height:1.7;">
        Your 10% off code is ready now. Keep it safe and enter it in Stripe Checkout when you are ready to secure the drop.
      </p>
      <div style="display:inline-block;margin:0 0 22px;padding:14px 18px;border:1px solid rgba(247,242,232,0.2);border-radius:999px;background:#151515;font-size:22px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
        ${discountCode}
      </div>
      <p style="margin:0 0 22px;color:#d7d0c5;line-height:1.7;">
        This code is single-use and tied to this email. Head to <a href="${storeUrl}" style="color:#f6f2e8;">${storeUrl}</a> and enter it in Stripe Checkout.
      </p>
      <p style="margin:0;color:#9f9588;font-size:13px;line-height:1.6;">
        This email was sent because you joined the WOL waitlist.
      </p>
    </div>
  `.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [email],
      subject: "Thanks for joining the WOL waitlist",
      html
    }),
    cache: "no-store"
  });

  const payload = await response.json();
  if (!response.ok || !payload.id) {
    throw new Error(payload?.message || payload?.error || "Failed to send launch discount email.");
  }

  return payload.id;
}

async function updateClaimRecord(claim) {
  const updatedClaim = {
    ...claim,
    updatedAt: new Date().toISOString()
  };

  await setStoredClaim(updatedClaim);
}

export async function claimDiscountAndSendEmail({ email, source = "waitlist", reward = "10% off" }) {
  if (!launchDiscountDispatchConfigured()) {
    throw new Error("Launch discount dispatch is not configured. Add Supabase, Stripe, and Resend environment variables.");
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const now = new Date().toISOString();
  let created = false;
  let claim = await getStoredClaim(normalizedEmail);

  if (!claim) {
    created = true;
    claim = {
      email: normalizedEmail,
      source,
      reward,
      createdAt: now,
      updatedAt: now,
      emailedAt: "",
      discountCode: "",
      promotionCodeId: "",
      couponId: "",
      resendEmailId: "",
      lastError: ""
    };

    claim = (await setStoredClaim(claim)) || claim;
  }

  if (claim.emailedAt && claim.discountCode) {
    return {
      created,
      emailed: false,
      claim
    };
  }

  let workingClaim = {
    ...claim,
    source: claim.source || source,
    reward: claim.reward || reward
  };

  try {
    const couponId = workingClaim.couponId || await ensureLaunchCouponId();

    if (!workingClaim.discountCode || !workingClaim.promotionCodeId || !workingClaim.couponId) {
      const promotion = await createPromotionCode({
        email: workingClaim.email,
        couponId
      });

      workingClaim = {
        ...workingClaim,
        couponId,
        promotionCodeId: promotion.promotionCodeId,
        discountCode: promotion.discountCode,
        lastError: ""
      };

      await updateClaimRecord(workingClaim);
    }

    const resendEmailId = await sendLaunchDiscountEmail({
      email: workingClaim.email,
      discountCode: workingClaim.discountCode
    });

    workingClaim = {
      ...workingClaim,
      resendEmailId,
      emailedAt: new Date().toISOString(),
      lastError: ""
    };

    await updateClaimRecord(workingClaim);

    return {
      created,
      emailed: true,
      claim: workingClaim
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create and send discount email.";

    await updateClaimRecord({
      ...workingClaim,
      lastError: message
    });

    throw error;
  }
}

export async function dispatchPendingDiscountEmails({ limit = 100 } = {}) {
  if (!launchDiscountDispatchConfigured()) {
    throw new Error("Launch discount dispatch is not configured. Add Supabase, Stripe, and Resend environment variables.");
  }

  const claims = await listDiscountClaims();
  const pendingClaims = claims
    .filter(function (claim) {
      return claim.email && !claim.emailedAt;
    })
    .slice(0, Math.max(1, Math.min(500, Number(limit) || 100)));

  if (pendingClaims.length === 0) {
    return {
      sent: 0,
      pending: 0,
      totalClaims: claims.length,
      errors: []
    };
  }

  const couponId = await ensureLaunchCouponId();
  const errors = [];
  let sent = 0;

  for (const claim of pendingClaims) {
    try {
      const promotion = await createPromotionCode({
        email: claim.email,
        couponId
      });

      const resendEmailId = await sendLaunchDiscountEmail({
        email: claim.email,
        discountCode: promotion.discountCode
      });

      await updateClaimRecord({
        ...claim,
        couponId,
        promotionCodeId: promotion.promotionCodeId,
        discountCode: promotion.discountCode,
        resendEmailId,
        emailedAt: new Date().toISOString(),
        lastError: ""
      });

      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown launch email error.";
      errors.push({
        email: claim.email,
        error: message
      });

      await updateClaimRecord({
        ...claim,
        lastError: message
      });
    }
  }

  return {
    sent,
    pending: Math.max(0, pendingClaims.length - sent),
    totalClaims: claims.length,
    errors
  };
}
