import { randomUUID } from "node:crypto";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
const LAUNCH_DISCOUNT_PERCENT = Number(process.env.LAUNCH_DISCOUNT_PERCENT || 10);
const LAUNCH_DISCOUNT_EXPIRY_ISO = process.env.LAUNCH_DISCOUNT_EXPIRY_ISO || "";

const CLAIM_EMAILS_KEY = "wol:discount-claims:emails";
const CLAIM_COUPON_KEY = "wol:discount-claims:coupon-id";

function requireRedisConfig() {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Discount storage is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
  }
}

function claimKey(email) {
  return `wol:discount-claims:claim:${email}`;
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

async function upstashRequest(pathname, init = {}) {
  requireRedisConfig();

  const response = await fetch(`${UPSTASH_REDIS_REST_URL}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    cache: "no-store"
  });

  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Upstash request failed.");
  }

  return payload.result;
}

async function upstashCommand(command) {
  return upstashRequest("", {
    method: "POST",
    body: JSON.stringify(command)
  });
}

async function upstashPipeline(commands) {
  return upstashRequest("/pipeline", {
    method: "POST",
    body: JSON.stringify(commands)
  });
}

async function getStoredCouponId() {
  const result = await upstashCommand(["GET", CLAIM_COUPON_KEY]);
  return typeof result === "string" && result ? result : "";
}

async function setStoredCouponId(couponId) {
  await upstashCommand(["SET", CLAIM_COUPON_KEY, couponId]);
}

async function getStoredClaim(email) {
  const result = await upstashCommand(["GET", claimKey(email)]);
  if (!result) {
    return null;
  }

  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

async function setStoredClaim(claim) {
  await upstashPipeline([
    ["SET", claimKey(claim.email), JSON.stringify(claim)],
    ["SADD", CLAIM_EMAILS_KEY, claim.email]
  ]);
}

export function discountStorageConfigured() {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
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

  await setStoredClaim(claim);
  return {
    created: true,
    claim
  };
}

export async function listDiscountClaims() {
  const emails = await upstashCommand(["SMEMBERS", CLAIM_EMAILS_KEY]);
  if (!Array.isArray(emails) || emails.length === 0) {
    return [];
  }

  const results = await upstashPipeline(
    emails.map(function (email) {
      return ["GET", claimKey(email)];
    })
  );

  return results
    .map(function (entry) {
      if (!entry || typeof entry.result !== "string") {
        return null;
      }

      try {
        return JSON.parse(entry.result);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
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
      <h1 style="margin:0 0 16px;font-size:32px;line-height:1;">Your launch discount is ready.</h1>
      <p style="margin:0 0 18px;color:#d7d0c5;line-height:1.7;">
        Use the code below at checkout when the product drops. This code is single-use and tied to your launch claim.
      </p>
      <div style="display:inline-block;margin:0 0 22px;padding:14px 18px;border:1px solid rgba(247,242,232,0.2);border-radius:999px;background:#151515;font-size:22px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
        ${discountCode}
      </div>
      <p style="margin:0 0 22px;color:#d7d0c5;line-height:1.7;">
        When you are ready, head to <a href="${storeUrl}" style="color:#f6f2e8;">${storeUrl}</a> and enter your code in Stripe Checkout.
      </p>
      <p style="margin:0;color:#9f9588;font-size:13px;line-height:1.6;">
        This email was sent because you claimed the WOL 10% launch offer.
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
      subject: "Your WOL 10% launch code",
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
  await setStoredClaim({
    ...claim,
    updatedAt: new Date().toISOString()
  });
}

export async function dispatchPendingDiscountEmails({ limit = 100 } = {}) {
  if (!launchDiscountDispatchConfigured()) {
    throw new Error("Launch discount dispatch is not configured. Add Redis, Stripe, and Resend environment variables.");
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
    pending: Math.max(0, claims.length - sent),
    totalClaims: claims.length,
    errors
  };
}
