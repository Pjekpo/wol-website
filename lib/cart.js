export const CART_KEY = "wol_collective_cart";

function clampQuantity(value) {
  const quantity = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(10, quantity));
}

function normalizeSize(size) {
  return String(size || "").trim().slice(0, 20);
}

function mergeCartItems(items) {
  const merged = new Map();

  items.forEach(function (item) {
    const size = normalizeSize(item?.size);
    const quantity = clampQuantity(item?.quantity);

    if (!size || quantity < 1) {
      return;
    }

    const current = merged.get(size) || 0;
    merged.set(size, Math.max(1, Math.min(10, current + quantity)));
  });

  return Array.from(merged.entries()).map(function ([size, quantity]) {
    return { size, quantity };
  });
}

export function normalizeCartItems(value) {
  if (Array.isArray(value)) {
    return mergeCartItems(value);
  }

  if (value && typeof value === "object" && typeof value.quantity === "number") {
  const size = normalizeSize(value.size);
  const quantity = clampQuantity(value.quantity);

    if (!size || quantity < 1) {
      return [];
    }

    return [{ size, quantity }];
  }

  return [];
}

export function parseStoredCart(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    return normalizeCartItems(JSON.parse(rawValue));
  } catch {
    return [];
  }
}

export function getCartQuantity(items) {
  return normalizeCartItems(items).reduce(function (total, item) {
    return total + item.quantity;
  }, 0);
}

export function getCartSubtotal(items, unitPrice) {
  return getCartQuantity(items) * Number(unitPrice || 0);
}

export function addCartItem(items, nextItem) {
  const size = normalizeSize(nextItem?.size);
  const quantity = clampQuantity(nextItem?.quantity);

  if (!size || quantity < 1) {
    return normalizeCartItems(items);
  }

  return mergeCartItems([
    ...normalizeCartItems(items),
    {
      size,
      quantity
    }
  ]);
}

export function updateCartItemQuantity(items, size, nextQuantity) {
  const normalizedSize = normalizeSize(size);
  const normalizedItems = normalizeCartItems(items);

  if (!normalizedSize) {
    return normalizedItems;
  }

  if (Number(nextQuantity) <= 0) {
    return normalizedItems.filter(function (item) {
      return item.size !== normalizedSize;
    });
  }

  return normalizedItems.map(function (item) {
    if (item.size !== normalizedSize) {
      return item;
    }

    return {
      ...item,
      quantity: clampQuantity(nextQuantity)
    };
  });
}

export function buildCartSizeSummary(items) {
  return normalizeCartItems(items)
    .map(function (item) {
      return `${item.size}:${item.quantity}`;
    })
    .join(", ");
}
