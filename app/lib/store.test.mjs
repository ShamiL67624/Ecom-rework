import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./store.js", import.meta.url), "utf8");
const {
  products,
  formatMoney,
  makeCartKey,
  sanitizeCart,
  sanitizeWishlist,
  calculateTotals,
  validateCheckout,
  buildWhatsAppOrderUrl,
  DEFAULT_DESIGN,
  DEFAULT_PRINT,
  updateDesignSide,
  designUploads,
  sanitizeDesign,
  sanitizeStudio,
  resolveColor,
} = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const firstProduct = products[0];
const validItem = {
  key: makeCartKey(firstProduct.id, firstProduct.colors[0].name, "M"),
  productId: firstProduct.id,
  name: firstProduct.name,
  price: firstProduct.price,
  color: firstProduct.colors[0].name,
  size: "M",
  quantity: 1,
};
const customer = {
  fullName: "Asha Nair",
  phone: "9876543210",
  email: "asha@example.com",
  address: "24 Park Road, Flat 3",
  city: "Kochi",
  state: "Kerala",
  pincode: "682001",
  note: "Please call on arrival & use the side entrance.",
};

test("design restoration rejects unsafe uploads and bounds the editable fields", () => {
  const design = sanitizeDesign({ text: "A".repeat(100), logo: "upload", image: "https://example.com/logo.svg", ink: "red;bad", placement: "invalid", scale: 999, monogram: "ABCDEFG", charm: "other" });
  assert.equal(design.front.text.length, 32);
  assert.equal(design.front.logo, "monogram");
  assert.equal(design.front.image, "");
  assert.equal(design.front.ink, "auto");
  assert.equal(design.front.scale, 120);
  assert.equal(design.front.monogram, "ABCD");
  assert.equal(design.front.enabled, true);
  assert.equal(design.back.enabled, false);
  assert.deepEqual(sanitizeDesign(null), DEFAULT_DESIGN);
  assert.equal(sanitizeDesign({ text: "", logo: "none", charm: "none" }).front.text, "");
});

test("legacy front, back and both-side artwork migrates without losing its original placement", () => {
  for (const placement of ["front", "back", "both"]) {
    const old = { text: "EXISTING DESIGN", logo: "monogram", monogram: "AX", placement, scale: 110 };
    const design = sanitizeDesign(old);
    assert.equal(design.front.enabled, placement !== "back");
    assert.equal(design.back.enabled, placement !== "front");
    for (const side of ["front", "back"]) if (design[side].enabled) assert.equal(design[side].text, "EXISTING DESIGN");
    const saved = sanitizeCart([{ ...validItem, design: old }]);
    assert.deepEqual(saved[0].design, design);
    assert.deepEqual(sanitizeCart(JSON.stringify(saved)), saved);
  }
});

test("front and back artwork can be edited and disabled independently", () => {
  const front = updateDesignSide(DEFAULT_DESIGN, "front", { text: "FRONT ONLY", logo: "monogram", monogram: "AB", ink: "#aabbcc", font: "serif", scale: 115 });
  const both = updateDesignSide(front, "back", { text: "BACK ONLY", logo: "bolt", ink: "#112233", font: "mono", scale: 75 });
  assert.deepEqual(both.front, front.front);
  assert.equal(both.back.enabled, true);
  assert.equal(both.back.text, "BACK ONLY");
  assert.equal(front.back.enabled, false);
  const disabled = updateDesignSide(both, "front", { enabled: false });
  assert.deepEqual(disabled.back, both.back);
  assert.equal(disabled.front.text, "FRONT ONLY");
  assert.equal(disabled.front.enabled, false);
  assert.equal(updateDesignSide(disabled, "front", { enabled: true }).front.text, "FRONT ONLY");
  assert.deepEqual(sanitizeDesign(JSON.parse(JSON.stringify(both))), both);
});

test("each shirt restores its own palette or custom color without accepting arbitrary color names", () => {
  const studio = sanitizeStudio(JSON.stringify({ colors: { [products[0].id]: "Custom #123AbC", [products[1].id]: "Cherry", [products[2].id]: "made-up" }, design: updateDesignSide(DEFAULT_DESIGN, "front", { text: "OUR STUDIO" }) }));
  assert.equal(studio.colors[products[0].id], "Custom #123abc");
  assert.equal(studio.colors[products[1].id], "Cherry");
  assert.equal(studio.colors[products[2].id], undefined);
  assert.equal(studio.design.front.text, "OUR STUDIO");
  assert.equal(resolveColor(products[0], "Custom red"), null);
  assert.equal(resolveColor(products[0], "Custom #123abc").hex, "#123abc");
  assert.deepEqual(sanitizeStudio("{bad").colors, {});
});

test("cart snapshots preserve different designs and custom colors across reloads", () => {
  const design = updateDesignSide(DEFAULT_DESIGN, "front", { text: "FIRST EDITION", logo: "monogram", monogram: "AB" });
  const items = sanitizeCart([
    { ...validItem, color: "Custom #123abc", design },
    { ...validItem, color: "Custom #123abc", design },
    { ...validItem, color: "Custom #123abc", design: updateDesignSide(design, "back", { text: "SECOND EDITION" }) },
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 2);
  assert.notEqual(items[0].key, items[1].key);
  design.front.text = "LATER CHANGE";
  assert.equal(items[0].design.front.text, "FIRST EDITION");
  assert.equal(items[1].design.back.text, "SECOND EDITION");
  assert.deepEqual(sanitizeCart(JSON.stringify(items)), items);
});

test("WhatsApp includes printable customization details and an upload handoff without embedding image data", () => {
  const design = {
    front: { ...DEFAULT_PRINT, text: "LESS & MORE", logo: "upload", image: "data:image/png;base64,aGVsbG8=", imageName: "front-brand.png", ink: "#ab1234", font: "serif", scale: 115 },
    back: { ...DEFAULT_PRINT, text: "BACK EDITION", logo: "upload", image: "data:image/png;base64,YmFjaw==", imageName: "back-brand.png", ink: "#ff0000", font: "mono", scale: 75 },
    charm: "orb",
  };
  const url = new URL(buildWhatsAppOrderUrl({ items: [{ ...validItem, design }], customer }));
  const message = url.searchParams.get("text");
  for (const detail of ["Front print text: LESS & MORE", "Back print text: BACK EDITION", "front-brand.png", "back-brand.png", "attach the logo separately", "#ab1234", "#ff0000", "Orbit charm", "serif", "mono", "115%", "75%"]) assert.ok(message.includes(detail), detail);
  assert.ok(!message.includes("base64"));
  assert.deepEqual(designUploads(design).map(({ side, name }) => ({ side, name })), [{ side: "front", name: "front-brand.png" }, { side: "back", name: "back-brand.png" }]);
  assert.deepEqual(designUploads(updateDesignSide(design, "back", { enabled: false })).map(({ side }) => side), ["front"]);
});

test("stored cart recovers safely from missing, malformed, and obsolete data", () => {
  for (const value of [null, undefined, "{broken", "null", "{}", 42, {}]) {
    assert.deepEqual(sanitizeCart(value), []);
  }
  assert.deepEqual(sanitizeCart([null, {}, { ...validItem, productId: "removed" }, { ...validItem, size: "9XL" }, { ...validItem, color: "Unavailable" }]), []);
});

test("stored cart restores authoritative prices, merges duplicate variants, and caps quantity", () => {
  const restored = sanitizeCart(JSON.stringify([
    { ...validItem, name: "Changed name", price: 1, quantity: 2 },
    { ...validItem, quantity: 20 },
    { ...validItem, size: "L", quantity: 2.9 },
  ]));
  assert.equal(restored.length, 2);
  assert.deepEqual(restored[0], { ...validItem, quantity: 10 });
  assert.equal(restored[1].quantity, 2);
  assert.equal(restored[1].key, makeCartKey(firstProduct.id, validItem.color, "L"));
  assert.deepEqual(sanitizeCart([{ ...validItem, quantity: -2 }, { ...validItem, quantity: Infinity }, { ...validItem, quantity: 0 }]), []);
});

test("wishlist restores only known unique products", () => {
  assert.deepEqual(sanitizeWishlist(JSON.stringify([firstProduct.id, firstProduct.id, "missing", null, {}])), [firstProduct.id]);
  assert.deepEqual(sanitizeWishlist("invalid"), []);
});

test("variant keys distinguish both size and color without delimiter collisions", () => {
  assert.notEqual(makeCartKey("a:b", "c", "M"), makeCartKey("a", "b:c", "M"));
  assert.notEqual(makeCartKey("tee", "Moss", "M"), makeCartKey("tee", "Moss", "L"));
});

test("cart totals apply shipping only to nonempty orders below ₹5,000", () => {
  assert.deepEqual(calculateTotals([]), { subtotal: 0, shipping: 0, total: 0 });
  assert.deepEqual(calculateTotals([validItem]), { subtotal: 2490, shipping: 150, total: 2640 });
  assert.deepEqual(calculateTotals([{ ...validItem, quantity: 2 }]), { subtotal: 4980, shipping: 150, total: 5130 });
  assert.deepEqual(calculateTotals([{ price: 2500, quantity: 2 }]), { subtotal: 5000, shipping: 0, total: 5000 });
  assert.deepEqual(calculateTotals([{ ...validItem, quantity: 3 }]), { subtotal: 7470, shipping: 0, total: 7470 });
});

test("checkout requires deliverable details and validates Indian mobile numbers and PIN codes", () => {
  assert.deepEqual(validateCheckout(customer), {});
  assert.deepEqual(validateCheckout({ ...customer, phone: "98765 43210", email: "" }), {});
  const emptyErrors = validateCheckout({});
  for (const field of ["fullName", "phone", "address", "city", "state", "pincode"]) assert.ok(emptyErrors[field]);
  assert.ok(validateCheckout({ ...customer, phone: "1234567890" }).phone);
  assert.ok(validateCheckout({ ...customer, phone: "98765432101" }).phone);
  assert.ok(validateCheckout({ ...customer, email: "invalid-email" }).email);
  assert.ok(validateCheckout({ ...customer, pincode: "000000" }).pincode);
});

test("WhatsApp order draft targets the requested number and includes every checkout detail", () => {
  const items = [validItem, { ...validItem, size: "L", quantity: 2 }];
  const totals = calculateTotals(items);
  const url = new URL(buildWhatsAppOrderUrl({ items, customer, totals, orderId: "AX-TEST-001" }));
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/919961821977");
  const text = url.searchParams.get("text");
  for (const expected of ["AX-TEST-001", validItem.name, validItem.color, "Size: M", "Size: L", "Qty: 2", "Shipping: Free", formatMoney(totals.total), ...Object.values(customer), "No payment has been collected."]) {
    assert.ok(text.includes(expected), `Missing from order message: ${expected}`);
  }
  assert.equal(url.searchParams.size, 1, "customer notes cannot inject URL parameters");
});

test("optional email and note are omitted cleanly from the WhatsApp draft", () => {
  const text = new URL(buildWhatsAppOrderUrl({ items: [validItem], customer: { ...customer, email: "", note: "" }, orderId: "AX-TEST-002" })).searchParams.get("text");
  assert.ok(!text.includes("Email:"));
  assert.ok(!text.includes("Note:"));
  assert.ok(text.includes("Shipping: ₹150"));
});
