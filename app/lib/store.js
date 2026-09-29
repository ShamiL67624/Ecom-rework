const allSizes = ["XS", "S", "M", "L", "XL", "XXL"];

export const products = [
  {
    id: "essential-heavyweight",
    slug: "essential-heavyweight",
    name: "Essential Heavyweight",
    price: 2490,
    category: "Essentials",
    description: "A clean everyday silhouette with a substantial feel. Heavyweight cotton, a considered neckline, and room to move.",
    colors: [
      { name: "Washed black", hex: "#303331" },
      { name: "Chalk", hex: "#dedbce" },
      { name: "Moss", hex: "#65705a" },
    ],
    sizes: [...allSizes],
    badge: "THE ORIGINAL",
  },
  {
    id: "studio-oversized",
    slug: "studio-oversized",
    name: "Studio Oversized",
    price: 2790,
    category: "Oversized",
    description: "Dropped shoulders and an easy, generous fit. A softly structured tee made for days that unfold at your own pace.",
    colors: [
      { name: "Chalk", hex: "#dedbce" },
      { name: "Washed black", hex: "#303331" },
      { name: "Stone", hex: "#a39685" },
    ],
    sizes: [...allSizes],
    badge: "NEW FORM",
  },
  {
    id: "everyday-box-tee",
    slug: "everyday-box-tee",
    name: "Everyday Box Tee",
    price: 2290,
    category: "Essentials",
    description: "A little wider, a little shorter. Our boxy everyday shape pairs a relaxed drape with a neat, intentional finish.",
    colors: [
      { name: "Moss", hex: "#65705a" },
      { name: "Chalk", hex: "#dedbce" },
      { name: "Clay", hex: "#976b5a" },
    ],
    sizes: [...allSizes],
    badge: "DAILY UNIFORM",
  },
  {
    id: "archive-graphic-tee",
    slug: "archive-graphic-tee",
    name: "Archive Graphic Tee",
    price: 2990,
    category: "Graphic",
    description: "An expressive studio graphic on a relaxed cotton silhouette. A wearable piece from the ATELIER IX archive.",
    colors: [
      { name: "Washed black", hex: "#303331" },
      { name: "Chalk", hex: "#dedbce" },
    ],
    sizes: [...allSizes],
    badge: "STUDIO SERIES",
  },
  {
    id: "ribbed-everyday-tee",
    slug: "ribbed-everyday-tee",
    name: "Ribbed Everyday Tee",
    price: 1890,
    category: "Essentials",
    description: "Quiet texture with a closer, comfortable fit. A versatile ribbed layer that feels just as good worn on its own.",
    colors: [
      { name: "Stone", hex: "#a39685" },
      { name: "Washed black", hex: "#303331" },
      { name: "Chalk", hex: "#dedbce" },
    ],
    sizes: [...allSizes],
    badge: "SOFT TEXTURE",
  },
  {
    id: "edition-09-tee",
    slug: "edition-09-tee",
    name: "Edition 09 Tee",
    price: 3290,
    category: "Graphic",
    description: "Edition 09 brings an understated graphic to our signature generous cut. An everyday piece with a point of view.",
    colors: [
      { name: "Clay", hex: "#976b5a" },
      { name: "Washed black", hex: "#303331" },
      { name: "Chalk", hex: "#dedbce" },
    ],
    sizes: [...allSizes],
    badge: "EDITION 09",
  },
];

export const CART_STORAGE_KEY = "atelier-ix-cart-v2";
export const WISHLIST_STORAGE_KEY = "atelier-ix-wishlist-v2";
export const STUDIO_STORAGE_KEY = "atelier-ix-studio-v1";
export const DEFAULT_PRINT = Object.freeze({
  enabled: true,
  text: "STAY IN MOTION", logo: "orbit", monogram: "IX", image: "", imageName: "",
  ink: "auto", font: "sans", scale: 100,
});
export const EMPTY_PRINT = Object.freeze({ ...DEFAULT_PRINT, enabled: false, text: "", logo: "none" });
export const DEFAULT_DESIGN = Object.freeze({
  front: DEFAULT_PRINT, back: EMPTY_PRINT, charm: "tag",
});
export const EXTRA_COLORS = [
  { name: "Cobalt", hex: "#4863a5" },
  { name: "Cherry", hex: "#a84c4e" },
  { name: "Lavender", hex: "#9684b5" },
];
const hexColor = /^#[0-9a-f]{6}$/i;
const oneLine = (value, length) => typeof value === "string" ? Array.from(value.replace(/[\u0000-\u001f\u007f]/g, " ")).slice(0, length).join("") : "";

export function sanitizePrint(value, fallback = DEFAULT_PRINT) {
  const input = value && typeof value === "object" ? value : fallback;
  const pick = (key, options) => options.includes(input[key]) ? input[key] : fallback[key];
  const image = typeof input.image === "string" && input.image.length <= 65000 && /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(input.image) ? input.image : "";
  let logo = pick("logo", ["monogram", "orbit", "bolt", "none", "upload"]);
  if (logo === "upload" && !image) logo = "monogram";
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    text: typeof input.text === "string" ? oneLine(input.text, 32) : fallback.text,
    logo, monogram: oneLine(input.monogram ?? fallback.monogram, 4),
    image: logo === "upload" ? image : "", imageName: logo === "upload" ? oneLine(input.imageName || "My logo", 60) : "",
    ink: hexColor.test(input.ink) ? input.ink.toLowerCase() : "auto",
    font: pick("font", ["sans", "serif", "mono"]),
    scale: Number.isFinite(Number(input.scale)) ? Math.max(70, Math.min(120, Math.round(Number(input.scale)))) : 100,
  };
}

export function sanitizeDesign(value) {
  const input = value && typeof value === "object" ? value : DEFAULT_DESIGN;
  const charm = ["none", "tag", "orb"].includes(input.charm) ? input.charm : DEFAULT_DESIGN.charm;
  if ("front" in input || "back" in input) {
    return { front: sanitizePrint(input.front), back: sanitizePrint(input.back, EMPTY_PRINT), charm };
  }
  // Restore older shared artwork on the sides where it was originally printed.
  const placement = ["front", "back", "both"].includes(input.placement) ? input.placement : "front";
  const print = sanitizePrint(input);
  return {
    front: { ...print, enabled: placement !== "back" },
    back: placement === "front" ? { ...EMPTY_PRINT } : { ...print, enabled: true },
    charm,
  };
}

export function updateDesignSide(value, side, patch) {
  const design = sanitizeDesign(value);
  if (side !== "front" && side !== "back") return design;
  return { ...design, [side]: sanitizePrint({ ...design[side], enabled: true, ...patch }) };
}

export function designUploads(value) {
  const design = sanitizeDesign(value);
  return ["front", "back"].filter((side) => design[side].enabled && design[side].logo === "upload")
    .map((side) => ({ side, image: design[side].image, name: design[side].imageName }));
}

export function colorChoices(product) { return [...product.colors, ...EXTRA_COLORS]; }

export function resolveColor(product, colorName) {
  const known = colorChoices(product).find((color) => color.name === colorName);
  if (known) return known;
  const custom = typeof colorName === "string" ? /^Custom (#[0-9a-f]{6})$/i.exec(colorName) : null;
  return custom ? { name: `Custom ${custom[1].toLowerCase()}`, hex: custom[1].toLowerCase() } : null;
}

export function sanitizeStudio(value) {
  const stored = readStoredValue(value);
  const colors = {};
  for (const product of products) {
    const selected = resolveColor(product, stored?.colors?.[product.id]);
    if (selected) colors[product.id] = selected.name;
  }
  return { design: sanitizeDesign(stored?.design), colors };
}

export function describeDesign(value) {
  const design = sanitizeDesign(value);
  return [
    ...["front", "back"].flatMap((side) => {
      const print = design[side];
      const label = side === "front" ? "Front" : "Back";
      if (!print.enabled) return [`${label}: No print`];
      return [
        `${label} print text: ${print.text || "None"}`,
        `${label} logo: ${print.logo === "upload" ? `Uploaded — ${print.imageName} (attach the logo separately in WhatsApp)` : print.logo === "monogram" ? `Monogram ${print.monogram}` : print.logo}`,
        `${label} print: Font: ${print.font} | Ink: ${print.ink === "auto" ? "Auto contrast" : print.ink} | Scale: ${print.scale}%`,
      ];
    }),
    `Accessory: ${design.charm === "none" ? "None" : design.charm === "orb" ? "Orbit charm" : "Studio tag"}`,
  ];
}

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatMoney(value) {
  return moneyFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

export function makeCartKey(productId, colorName, size, design) {
  const parts = [productId, colorName, size];
  // Keep the complete canonical design in the key to avoid merging different artwork.
  if (design) parts.push(JSON.stringify(sanitizeDesign(design)));
  return parts.map((part) => encodeURIComponent(String(part))).join(":");
}

function readStoredValue(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function sanitizeCart(value) {
  const stored = readStoredValue(value);
  if (!Array.isArray(stored)) return [];

  const validItems = new Map();
  for (const item of stored) {
    if (!item || typeof item !== "object") continue;
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || !product.sizes.includes(item.size)) continue;
    const color = resolveColor(product, item.color);
    const quantity = Number(item.quantity);
    if (!color || !Number.isFinite(quantity) || quantity < 1) continue;

    const design = item.design ? sanitizeDesign(item.design) : null;
    const key = makeCartKey(product.id, color.name, item.size, design);
    const previousQuantity = validItems.get(key)?.quantity || 0;
    validItems.set(key, {
      key,
      productId: product.id,
      name: product.name,
      price: product.price,
      color: color.name,
      size: item.size,
      quantity: Math.min(10, previousQuantity + Math.floor(quantity)),
      ...(design ? { design } : {}),
    });
  }
  return [...validItems.values()];
}

export function sanitizeWishlist(value) {
  const stored = readStoredValue(value);
  if (!Array.isArray(stored)) return [];
  const productIds = new Set(products.map((product) => product.id));
  return [...new Set(stored.filter((id) => typeof id === "string" && productIds.has(id)))];
}

export function calculateTotals(items) {
  const subtotal = (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity < 1) return sum;
    return sum + price * Math.floor(quantity);
  }, 0);
  const shipping = subtotal > 0 && subtotal < 5000 ? 150 : 0;
  return { subtotal, shipping, total: subtotal + shipping };
}

const clean = (value) => (typeof value === "string" ? value.trim() : "");
const cleanPhone = (value) => clean(value).replace(/[\s()-]/g, "");

export function validateCheckout(data = {}) {
  const errors = {};
  if (clean(data.fullName).length < 2) errors.fullName = "Enter your full name.";
  if (!/^[6-9]\d{9}$/.test(cleanPhone(data.phone))) errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (clean(data.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(data.email))) errors.email = "Enter a valid email address, or leave this blank.";
  if (clean(data.address).length < 8) errors.address = "Enter your complete street address.";
  if (clean(data.city).length < 2) errors.city = "Enter your city.";
  if (clean(data.state).length < 2) errors.state = "Enter your state.";
  if (!/^[1-9]\d{5}$/.test(clean(data.pincode))) errors.pincode = "Enter a valid 6-digit PIN code.";
  return errors;
}

export function buildWhatsAppOrderUrl({ items, customer, totals, orderId }) {
  const summary = totals || calculateTotals(items);
  const lines = [
    "ATELIER IX — ORDER REQUEST",
    `Reference: ${clean(orderId) || "New order"}`,
    "",
    "ITEMS",
    ...items.flatMap((item, index) => [
      `${index + 1}. ${item.name}`,
      `Color: ${item.color} | Size: ${item.size} | Qty: ${item.quantity}`,
      `Unit: ${formatMoney(item.price)} | Line total: ${formatMoney(item.price * item.quantity)}`,
      ...(item.design ? describeDesign(item.design) : []),
    ]),
    "",
    `Subtotal: ${formatMoney(summary.subtotal)}`,
    `Shipping: ${summary.shipping === 0 ? "Free" : formatMoney(summary.shipping)}`,
    `TOTAL: ${formatMoney(summary.total)}`,
    "",
    "DELIVERY DETAILS",
    `Name: ${clean(customer.fullName)}`,
    `Phone: +91 ${cleanPhone(customer.phone)}`,
    ...(clean(customer.email) ? [`Email: ${clean(customer.email)}`] : []),
    `Address: ${clean(customer.address)}`,
    `City: ${clean(customer.city)}`,
    `State: ${clean(customer.state)}`,
    `PIN: ${clean(customer.pincode)}`,
    "Country: India",
    ...(clean(customer.note) ? ["", `Note: ${clean(customer.note)}`] : []),
    "",
    "Please confirm availability and payment details. No payment has been collected.",
  ];
  // This opens a draft. The customer must press Send in WhatsApp to submit it.
  return `https://wa.me/919961821977?text=${encodeURIComponent(lines.join("\n"))}`;
}
