const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium, expect } = require("@playwright/test");

const baseURL = process.env.BASE_URL || "http://127.0.0.1:3000";
const artifacts = path.resolve(__dirname, "../artifacts");
const pageErrors = [];
const checks = [];
const customer = {
  name: "Asha Nair",
  phone: "9876543210",
  email: "asha@example.com",
  address: "24 Park Road, Flat 3 & East entrance",
  city: "Kochi",
  state: "Kerala",
  pin: "682001",
  note: "Please call on arrival & ring the bell.",
};

async function check(label, work) {
  await work();
  checks.push(label);
  console.log(`PASS ${label}`);
}

async function noOverflow(page, label) {
  const result = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    overflow: [...document.querySelectorAll("main *")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.right > window.innerWidth + 2 || box.left < -2);
      })
      .slice(0, 6)
      .map((element) => ({ tag: element.tagName, class: element.className?.baseVal || element.className })),
  }));
  assert.ok(Math.max(result.document, result.body) <= result.viewport + 1, `${label} has horizontal overflow: ${JSON.stringify(result)}`);
}

async function shop(page) {
  await page.goto(`${baseURL}/shop`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Quick shop Essential Heavyweight", exact: true })).toBeVisible();
}

async function addShirt(page, name, color, size) {
  const quickShop = page.getByRole("button", { name: `Quick shop ${name}`, exact: true });
  await quickShop.locator("..").hover();
  await quickShop.click();
  const product = page.getByRole("dialog", { name: `Choose ${name}`, exact: true });
  await expect(product).toBeVisible();
  await product.getByRole("button", { name: `Choose ${color}`, exact: true }).click();
  await product.getByRole("button", { name: `Size ${size}`, exact: true }).click();
  await expect(product.getByRole("button", { name: `Choose ${color}`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(product.getByRole("button", { name: `Size ${size}`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await product.getByRole("button", { name: /^Add to bag/ }).click();
  await expect(product.getByRole("button", { name: /^Added to your bag/ })).toBeVisible();
  await expect(page.locator(".bag-flight")).toHaveCount(1);
  await product.getByRole("button", { name: "Close product", exact: true }).click();
  await expect(product).not.toBeVisible();
}

async function openBag(page, count) {
  await page.getByRole("button", { name: `Open bag, ${count} items`, exact: true }).click();
  const bag = page.getByRole("dialog", { name: "Shopping bag", exact: true });
  await expect(bag).toBeVisible();
  return bag;
}

async function runDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  context.on("page", (page) => page.on("pageerror", (error) => pageErrors.push(error.message)));
  const page = await context.newPage();
  await check("desktop landing and 3D shirt render without horizontal overflow", async () => {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toBeVisible();
    const scene = page.getByTestId("hero-scene").getByRole("img", { name: /Interactive 3D Atelier IX T-shirt|Oversized Atelier IX T-shirt preview/ });
    await expect(scene).toBeVisible({ timeout: 30000 });
    await expect.poll(async () => scene.evaluate((element) => element.dataset.ready === "true" || element.tabIndex === -1), { timeout: 30000 }).toBe(true);
    await expect(scene.locator("canvas, svg").first()).toBeVisible();
    await noOverflow(page, "Desktop landing");
    await page.screenshot({ path: path.join(artifacts, "desktop-home.png"), animations: "disabled" });
    await page.screenshot({ path: path.join(artifacts, "desktop-full.png"), animations: "disabled", fullPage: true });
  });

  await check("hero color switching updates the selected shirt and supports drag rotation", async () => {
    const black = page.getByRole("button", { name: "Preview Washed black", exact: true });
    const chalk = page.getByRole("button", { name: "Preview Chalk", exact: true });
    await black.click();
    await expect(black).toHaveAttribute("aria-pressed", "true");
    await expect(chalk).toHaveAttribute("aria-pressed", "false");
    await chalk.click();
    await expect(chalk).toHaveAttribute("aria-pressed", "true");
    const back = page.getByRole("button", { name: "back", exact: true });
    const front = page.getByRole("button", { name: "front", exact: true });
    await back.click();
    await expect(back).toHaveAttribute("aria-pressed", "true");
    await expect(front).toHaveAttribute("aria-pressed", "false");
    await front.click();
    await expect(front).toHaveAttribute("aria-pressed", "true");
    const scene = page.getByTestId("hero-scene").getByRole("img", { name: /Interactive 3D Atelier IX T-shirt|Oversized Atelier IX T-shirt preview/ });
    if (await scene.locator("canvas").count()) {
      const box = await scene.boundingBox();
      const before = await scene.screenshot({ animations: "disabled" });
      await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.66, box.y + box.height * 0.56, { steps: 12 });
      await page.mouse.up();
      await expect.poll(async () => !before.equals(await scene.screenshot({ animations: "disabled" })), { timeout: 5000 }).toBe(true);
      await scene.focus();
      await page.keyboard.press("Home");
    }
  });

  await check("quick shop selects a variant, animates add to bag, and persists the cart", async () => {
    await shop(page);
    await addShirt(page, "Essential Heavyweight", "Chalk", "L");
    let bag = await openBag(page, 1);
    await expect(bag.getByTestId("cart-line")).toHaveCount(1);
    await expect(bag.getByTestId("cart-line")).toContainText("Chalk");
    await expect(bag.getByTestId("cart-line")).toContainText("L");
    await expect(bag.getByTestId("cart-total")).toHaveText("₹2,640");
    await bag.getByRole("button", { name: "Close bag", exact: true }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    bag = await openBag(page, 1);
    await expect(bag.getByTestId("cart-total")).toHaveText("₹2,640");
    await bag.getByRole("button", { name: "Close bag", exact: true }).click();
  });

  await check("bag quantities recalculate totals and removal produces an empty checkout", async () => {
    const bag = await openBag(page, 1);
    await bag.getByRole("button", { name: "Increase quantity of Essential Heavyweight", exact: true }).click();
    await expect(bag.getByLabel("Quantity", { exact: true })).toHaveText("2");
    await expect(bag.getByTestId("cart-total")).toHaveText("₹5,130");
    await bag.getByRole("button", { name: "Decrease quantity of Essential Heavyweight", exact: true }).click();
    await expect(bag.getByTestId("cart-total")).toHaveText("₹2,640");
    await bag.getByRole("button", { name: "Remove Essential Heavyweight from bag", exact: true }).click();
    await expect(bag.getByTestId("cart-line")).toHaveCount(0);
    await expect(bag.getByRole("link", { name: /Explore the collection/ })).toBeVisible();
    await bag.getByRole("button", { name: "Close bag", exact: true }).click();
    await page.goto(`${baseURL}/checkout`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Continue on WhatsApp", exact: true })).toHaveCount(0);
    await expect(page.locator("main").getByRole("link", { name: /collection/i })).toBeVisible();
  });

  await check("wishlist persists across navigation and reload and can be removed", async () => {
    await shop(page);
    await page.getByRole("button", { name: "Save Studio Oversized to wishlist", exact: true }).click();
    await expect(page.getByRole("button", { name: "Remove Studio Oversized from wishlist", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Wishlist, 1 items", exact: true }).click();
    await expect(page).toHaveURL(/\/wishlist$/);
    await expect(page.getByRole("button", { name: "Quick shop Studio Oversized", exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Quick shop Studio Oversized", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove Studio Oversized from wishlist", exact: true }).click();
    await expect(page.getByRole("button", { name: "Quick shop Studio Oversized", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Wishlist, 0 items", exact: true })).toBeVisible();
  });

  await check("checkout rejects missing and invalid delivery details", async () => {
    await shop(page);
    await addShirt(page, "Essential Heavyweight", "Chalk", "L");
    await addShirt(page, "Studio Oversized", "Washed black", "XL");
    const bag = await openBag(page, 2);
    await bag.getByRole("button", { name: "Increase quantity of Essential Heavyweight", exact: true }).click();
    await expect(bag.getByTestId("cart-total")).toHaveText("₹7,770");
    await bag.getByRole("link", { name: "Continue to checkout", exact: true }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await page.getByRole("button", { name: "Continue on WhatsApp", exact: true }).click();
    await expect(page.getByText("Enter your full name.", { exact: true })).toBeVisible();
    await expect(page.getByText("Enter a valid 10-digit Indian mobile number.", { exact: true })).toBeVisible();
    await expect(page.getByText("Enter a valid 6-digit PIN code.", { exact: true })).toBeVisible();
    await page.locator('[name="fullName"]').fill(customer.name);
    await page.locator('[name="phone"]').fill("1234567890");
    await page.locator('[name="email"]').fill("invalid-email");
    await page.locator('[name="address"]').fill(customer.address);
    await page.locator('[name="city"]').fill(customer.city);
    await page.locator('[name="state"]').fill(customer.state);
    await page.locator('[name="pincode"]').fill("000000");
    await page.getByRole("button", { name: "Continue on WhatsApp", exact: true }).click();
    await expect(page.getByText("Enter a valid 10-digit Indian mobile number.", { exact: true })).toBeVisible();
    await expect(page.getByText("Enter a valid email address, or leave this blank.", { exact: true })).toBeVisible();
    await expect(page.getByText("Enter a valid 6-digit PIN code.", { exact: true })).toBeVisible();
  });

  await check("valid checkout opens an intercepted WhatsApp draft with the complete order", async () => {
    await page.locator('[name="phone"]').fill(customer.phone);
    await page.locator('[name="email"]').fill(customer.email);
    await page.locator('[name="pincode"]').fill(customer.pin);
    await page.locator('[name="note"]').fill(customer.note);
    await noOverflow(page, "Desktop checkout");
    await page.screenshot({ path: path.join(artifacts, "desktop-checkout.png"), animations: "disabled", fullPage: true });
    await context.route("https://wa.me/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Intercepted WhatsApp draft — no order sent</title>" }));
    const draftRequest = context.waitForEvent("request", (request) => request.url().startsWith("https://wa.me/"));
    await page.getByRole("button", { name: "Continue on WhatsApp", exact: true }).click();
    const request = await draftRequest;
    const url = new URL(request.url());
    assert.equal(url.origin, "https://wa.me");
    assert.equal(url.pathname, "/919961821977");
    assert.equal(url.searchParams.size, 1);
    const message = url.searchParams.get("text");
    for (const detail of ["Essential Heavyweight", "Studio Oversized", "Chalk", "Washed black", "Size: L", "Size: XL", "Qty: 2", "Qty: 1", "₹4,980", "₹2,790", "Subtotal: ₹7,770", "Shipping: Free", "TOTAL: ₹7,770", "No payment has been collected.", ...Object.values(customer)]) {
      assert.ok(message.includes(detail), `WhatsApp draft is missing: ${detail}`);
    }
    const reopen = page.getByRole("link", { name: "Open WhatsApp again", exact: true });
    await expect(reopen).toBeVisible();
    assert.equal(await reopen.getAttribute("href"), url.href);
    await fs.writeFile(path.join(artifacts, "whatsapp-draft.txt"), message, "utf8");
  });
  await context.close();
}

async function runMobile(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "reduce" });
  context.on("page", (page) => page.on("pageerror", (error) => pageErrors.push(error.message)));
  const page = await context.newPage();
  await check("mobile landing is responsive and menu links work", async () => {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByTestId("hero-scene").getByRole("img", { name: /Interactive 3D Atelier IX T-shirt|Oversized Atelier IX T-shirt preview/ })).toBeVisible({ timeout: 30000 });
    await noOverflow(page, "Mobile landing");
    await page.screenshot({ path: path.join(artifacts, "mobile-home.png"), animations: "disabled" });
    await page.screenshot({ path: path.join(artifacts, "mobile-full.png"), animations: "disabled", fullPage: true });
    const menuButton = page.getByRole("button", { name: "Open menu", exact: true });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const mobileNav = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
    await expect(mobileNav).toBeVisible();
    await mobileNav.getByRole("link", { name: "The collection", exact: true }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(mobileNav).not.toBeVisible();
    await noOverflow(page, "Mobile collection");
  });

  await check("mobile product selection, bag, and checkout remain usable", async () => {
    await addShirt(page, "Essential Heavyweight", "Moss", "S");
    const bag = await openBag(page, 1);
    await expect(bag.getByTestId("cart-line")).toContainText("Moss");
    const box = await bag.boundingBox();
    assert.ok(box.width <= 390, `Mobile bag is too wide: ${box.width}`);
    await bag.getByRole("link", { name: "Continue to checkout", exact: true }).click();
    await expect(page.getByLabel("Full name", { exact: true })).toBeVisible();
    await noOverflow(page, "Mobile checkout");
    await page.screenshot({ path: path.join(artifacts, "mobile-checkout.png"), animations: "disabled", fullPage: true });
  });
  await context.close();
}

(async () => {
  await fs.mkdir(artifacts, { recursive: true });
  let browser;
  try {
    try {
      browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
    } catch (chromeError) {
      console.log(`Chrome unavailable; trying bundled Chromium (${chromeError.message.split("\n")[0]}).`);
      browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
    }
    if (!process.argv.includes("--customizer-only")) {
      await runDesktop(browser);
      await runMobile(browser);
    }
    await require("./customizer-check.cjs")(browser, { baseURL, artifacts, check, noOverflow, pageErrors });
    assert.deepEqual(pageErrors, [], "Browser runtime errors were found");
    await fs.writeFile(path.join(artifacts, "browser-check-results.json"), JSON.stringify({ baseURL, checks, pageErrors, checkedAt: new Date().toISOString() }, null, 2));
    console.log(`\n${checks.length} browser checks passed. No orders sent. Screenshots: ${artifacts}`);
  } catch (error) {
    console.error(error);
    if (pageErrors.length) console.error("Runtime errors:", pageErrors);
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
})();
