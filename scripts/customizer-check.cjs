const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { expect } = require("@playwright/test");

module.exports = async function runCustomization(browser, { baseURL, artifacts, check, noOverflow, pageErrors }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "no-preference" });
  context.on("page", (page) => {
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error" && /THREE|shader|WebGL/i.test(message.text())) pageErrors.push(message.text()); });
  });
  const page = await context.newPage();
  const studio = page.locator("#customize");
  const scene = studio.locator(".custom-scene > div");
  const textInput = studio.getByRole("textbox", { name: /^Your words/ });
  const piece = studio.getByRole("combobox", { name: "Choose a T-shirt", exact: true });

  async function addFromStudio() {
    await studio.getByRole("button", { name: "Choose size & add to bag", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Choose Essential Heavyweight", exact: true });
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: /^Add to bag/ }).click();
    await expect(modal.getByRole("button", { name: /^Added to your bag/ })).toBeVisible();
    await modal.getByRole("button", { name: "Close product", exact: true }).click();
  }

  try {
    await check("front and back have independent text, logos, fonts, colors and print sizes", async () => {
      await page.goto(`${baseURL}/#customize`, { waitUntil: "networkidle" });
      await studio.scrollIntoViewIfNeeded();
      await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30000 });
      await textInput.fill("CREATE & EXPLORE");
      await studio.getByRole("combobox", { name: "Typography", exact: true }).selectOption("serif");
      await studio.getByRole("button", { name: "IX Monogram", exact: true }).click();
      await studio.getByRole("textbox", { name: /^Monogram/ }).fill("AX");
      await studio.getByRole("slider", { name: /^Print size/ }).fill("115");
      await studio.getByLabel("Custom print color", { exact: true }).fill("#e9daab");
      await studio.getByRole("button", { name: "Orbit charm", exact: true }).click();
      for (const preview of await page.locator(".product-card .shirt-preview, .studio-lineup .shirt-preview").all()) await expect(preview).toHaveAttribute("data-print", "CREATE & EXPLORE");
      await expect(scene).toHaveAttribute("data-artwork", "ready");
      const svg = decodeURIComponent(await studio.locator(".studio-lineup image").first().getAttribute("href"));
      assert.ok(svg.includes("CREATE &amp; EXPLORE"));
      assert.ok(svg.includes("Georgia, serif"));
      assert.ok(svg.includes("AX"));
      assert.ok(svg.includes("#e9daab"));
      assert.ok(svg.includes("scale(1.15)"));
      await studio.getByRole("button", { name: "Back design", exact: true }).click();
      await expect(textInput).toHaveValue("");
      await expect(studio.getByRole("checkbox", { name: "Enable back print", exact: true })).not.toBeChecked();
      await textInput.fill("AFTER HOURS");
      await studio.getByRole("button", { name: "ϟ Bolt", exact: true }).click();
      await studio.getByRole("combobox", { name: "Typography", exact: true }).selectOption("mono");
      await studio.getByLabel("Custom print color", { exact: true }).fill("#ff9977");
      await studio.getByRole("slider", { name: /^Print size/ }).fill("80");
      await expect(studio.getByRole("button", { name: "Studio back view", exact: true })).toHaveAttribute("aria-pressed", "true");
      for (const preview of await page.locator(".product-card .shirt-preview, .studio-lineup .shirt-preview").all()) {
        await expect(preview).toHaveAttribute("data-print", "AFTER HOURS");
        await expect(preview).toHaveAttribute("data-side", "back");
      }
      const backSvg = decodeURIComponent(await studio.locator(".studio-lineup image").first().getAttribute("href"));
      assert.ok(backSvg.includes("AFTER HOURS") && !backSvg.includes("CREATE &amp; EXPLORE"));
      assert.ok(backSvg.includes("Courier New") && backSvg.includes("#ff9977") && backSvg.includes("scale(0.8)"));
      await studio.getByRole("checkbox", { name: "Enable back print", exact: true }).uncheck();
      await expect(studio.locator(".studio-lineup image")).toHaveCount(0);
      await studio.getByRole("button", { name: "Front design", exact: true }).click();
      await expect(textInput).toHaveValue("CREATE & EXPLORE");
      await expect(studio.getByRole("textbox", { name: /^Monogram/ })).toHaveValue("AX");
      await expect(studio.getByRole("combobox", { name: "Typography", exact: true })).toHaveValue("serif");
      await expect(studio.getByLabel("Custom print color", { exact: true })).toHaveValue("#e9daab");
      await expect(studio.getByRole("slider", { name: /^Print size/ })).toHaveValue("115");
      await studio.getByRole("button", { name: "Back design", exact: true }).click();
      await expect(textInput).toHaveValue("AFTER HOURS");
      await studio.getByRole("checkbox", { name: "Enable back print", exact: true }).check();
      await studio.getByRole("button", { name: "Front design", exact: true }).click();
      await noOverflow(page, "Desktop customizer");
    });

    await check("individual shirt colors and shared artwork persist across reloads", async () => {
      await studio.getByLabel("Custom color for Essential Heavyweight", { exact: true }).fill("#426891");
      await piece.selectOption("studio-oversized");
      await studio.getByRole("button", { name: "Studio fabric Cherry", exact: true }).click();
      await expect(page.getByTestId("product-essential-heavyweight").locator("svg.shirt-preview")).toHaveAttribute("data-color", "#426891");
      await expect(page.getByTestId("product-studio-oversized").locator("svg.shirt-preview")).toHaveAttribute("data-color", "#a84c4e");
      await page.reload({ waitUntil: "networkidle" });
      await expect(textInput).toHaveValue("CREATE & EXPLORE");
      await studio.getByRole("button", { name: "Back design", exact: true }).click();
      await expect(textInput).toHaveValue("AFTER HOURS");
      await expect(studio.getByRole("button", { name: "ϟ Bolt", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(studio.getByLabel("Custom print color", { exact: true })).toHaveValue("#ff9977");
      await studio.getByRole("button", { name: "Front design", exact: true }).click();
      await expect(studio.getByLabel("Custom color for Essential Heavyweight", { exact: true })).toHaveValue("#426891");
      await expect(page.getByTestId("product-studio-oversized").locator("svg.shirt-preview")).toHaveAttribute("data-color", "#a84c4e");
      await studio.scrollIntoViewIfNeeded();
      await expect(scene).toHaveAttribute("data-artwork", "ready");
      await studio.screenshot({ path: path.join(artifacts, "customizer-desktop.png"), animations: "disabled", style: ".site-header, .skip-link, nextjs-portal { visibility: hidden; }" });
    });

    await check("fabric and accessory physics animate, respond to shake, and can be stopped", async () => {
      await scene.scrollIntoViewIfNeeded();
      await expect(scene).toHaveAttribute("data-ready", "true");
      await expect(scene).toHaveAttribute("data-motion", "active");
      const animated = await scene.screenshot();
      await expect.poll(async () => !animated.equals(await scene.screenshot())).toBe(true);
      await studio.getByRole("slider", { name: "Wind strength", exact: true }).fill("0");
      await studio.getByRole("button", { name: "Give it a shake", exact: true }).click();
      await scene.scrollIntoViewIfNeeded();
      const moving = await scene.screenshot();
      await expect.poll(async () => !moving.equals(await scene.screenshot())).toBe(true);
      await studio.getByRole("button", { name: "Fabric physics", exact: true }).click();
      await scene.scrollIntoViewIfNeeded();
      await expect(scene).toHaveAttribute("data-motion", "still");
      const still = await scene.screenshot({ animations: "disabled", style: ".site-header, .skip-link, nextjs-portal { visibility: hidden; }" });
      await expect.poll(async () => still.equals(await scene.screenshot({ animations: "disabled" }))).toBe(true);
      await expect(studio.getByRole("button", { name: "Give it a shake", exact: true })).toBeDisabled();
      await studio.getByRole("button", { name: "Studio back view", exact: true }).click();
      await expect(studio.getByRole("button", { name: "Studio back view", exact: true })).toHaveAttribute("aria-pressed", "true");
      await studio.getByRole("button", { name: "Studio front view", exact: true }).click();
    });

    await check("different logo uploads stay assigned to the correct side in previews and storage", async () => {
      const input = studio.getByLabel("Upload your own logo", { exact: true });
      await input.setInputFiles({ name: "unsafe.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
      await expect(studio.getByRole("alert")).toHaveText("Choose a PNG, JPG, or WebP image.");
      const data = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 192;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ddbb77";
        ctx.beginPath(); ctx.arc(96, 96, 78, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#173a38"; ctx.font = "bold 72px Arial"; ctx.textAlign = "center"; ctx.fillText("AX", 96, 122);
        return canvas.toDataURL("image/png").split(",")[1];
      });
      await input.setInputFiles({ name: "my-studio-logo.png", mimeType: "image/png", buffer: Buffer.from(data, "base64") });
      await expect(studio.getByAltText("Your uploaded logo", { exact: true })).toBeVisible();
      await expect(scene).toHaveAttribute("data-artwork", "ready");
      assert.ok(decodeURIComponent(await studio.locator(".studio-lineup image").first().getAttribute("href")).includes("data:image/webp;base64,"));
      const frontLogo = await studio.getByAltText("Your uploaded logo", { exact: true }).getAttribute("src");
      await studio.getByRole("button", { name: "Back design", exact: true }).click();
      await expect(studio.getByAltText("Your uploaded logo", { exact: true })).toHaveCount(0);
      const backData = await page.evaluate(() => {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 192;
        const ctx = canvas.getContext("2d"); ctx.fillStyle = "#ff9977"; ctx.fillRect(24, 24, 144, 144);
        ctx.fillStyle = "#1d2217"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center"; ctx.fillText("BACK", 96, 111);
        return canvas.toDataURL("image/png").split(",")[1];
      });
      await input.setInputFiles({ name: "back-studio-logo.png", mimeType: "image/png", buffer: Buffer.from(backData, "base64") });
      await expect(studio.getByAltText("Your uploaded logo", { exact: true })).toBeVisible();
      const backLogo = await studio.getByAltText("Your uploaded logo", { exact: true }).getAttribute("src");
      assert.notEqual(frontLogo, backLogo);
      await expect(scene).toHaveAttribute("data-artwork", "ready");
      const backSvg = decodeURIComponent(await studio.locator(".studio-lineup image").first().getAttribute("href"));
      assert.ok(backSvg.includes(backLogo) && !backSvg.includes(frontLogo));
      await studio.screenshot({ path: path.join(artifacts, "customizer-back.png"), animations: "disabled", style: ".site-header, .skip-link, nextjs-portal { visibility: hidden; }" });
      await studio.getByRole("button", { name: "Front design", exact: true }).click();
      await expect(studio.getByAltText("Your uploaded logo", { exact: true })).toHaveAttribute("src", frontLogo);
      await studio.screenshot({ path: path.join(artifacts, "customizer-upload.png"), animations: "disabled", style: ".site-header, .skip-link, nextjs-portal { visibility: hidden; }" });
      await page.reload({ waitUntil: "networkidle" });
      await expect(studio.getByAltText("Your uploaded logo", { exact: true })).toHaveAttribute("src", frontLogo);
      await studio.getByRole("button", { name: "Back design", exact: true }).click();
      await expect(studio.getByAltText("Your uploaded logo", { exact: true })).toHaveAttribute("src", backLogo);
      await studio.getByRole("button", { name: "Front design", exact: true }).click();
    });

    await check("different designs remain separate in the bag and retain their order details", async () => {
      await textInput.fill("FIRST EDITION");
      await addFromStudio();
      await textInput.fill("SECOND EDITION");
      await addFromStudio();
      await textInput.fill("NEXT COLLECTION");
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Open bag, 2 items", exact: true }).click();
      const bag = page.getByRole("dialog", { name: "Shopping bag", exact: true });
      await expect(bag.getByTestId("cart-line")).toHaveCount(2);
      await expect(bag).toContainText("FIRST EDITION");
      await expect(bag).toContainText("SECOND EDITION");
      await expect(bag).not.toContainText("NEXT COLLECTION");
      await expect(bag.locator(".cart-design > a")).toHaveCount(4);
      await expect(bag.locator(".cart-side-summary").filter({ hasText: "AFTER HOURS" })).toHaveCount(2);
      await bag.getByTestId("cart-line").first().getByRole("button", { name: "back", exact: true }).click();
      await expect(bag.getByTestId("cart-line").first().locator(".shirt-preview")).toHaveAttribute("data-print", "AFTER HOURS");
      await bag.screenshot({ path: path.join(artifacts, "customizer-bag.png") });
      await bag.getByRole("link", { name: "Continue to checkout", exact: true }).click();
      await expect(page.locator(".checkout-items")).toContainText("FIRST EDITION");
      await expect(page.locator(".checkout-items")).toContainText("SECOND EDITION");
      const fields = { fullName: "Studio Customer", phone: "9876543210", address: "24 Example Road", city: "Kochi", state: "Kerala", pincode: "682001" };
      for (const [name, value] of Object.entries(fields)) await page.locator(`[name="${name}"]`).fill(value);
      await context.route("https://wa.me/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Intercepted draft</title>" }));
      const requested = context.waitForEvent("request", (request) => request.url().startsWith("https://wa.me/"));
      await page.getByRole("button", { name: "Continue on WhatsApp", exact: true }).click();
      const message = new URL((await requested).url()).searchParams.get("text");
      for (const detail of ["Front print text: FIRST EDITION", "Front print text: SECOND EDITION", "Back print text: AFTER HOURS", "Custom #426891", "my-studio-logo.png", "back-studio-logo.png", "attach the logo separately", "Orbit charm", "#e9daab", "#ff9977", "115%", "80%"]) assert.ok(message.includes(detail), detail);
      assert.ok(!message.includes("base64"));
      await expect(page.locator(".order-attachments a")).toHaveCount(2);
      await expect(page.locator(".order-attachments")).toContainText("Front logo");
      await expect(page.locator(".order-attachments")).toContainText("Back logo");
      await fs.writeFile(path.join(artifacts, "custom-order-draft.txt"), message);
    });
  } finally { await context.close(); }

  await check("mobile customization works at narrow widths and respects reduced motion", async () => {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const page = await mobile.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    try {
      await page.goto(`${baseURL}/shop`, { waitUntil: "networkidle" });
      const studio = page.locator("#customize");
      await studio.getByRole("textbox", { name: /^Your words/ }).fill("FRONT WAVES");
      await studio.getByRole("button", { name: "Back design", exact: true }).click();
      await studio.getByRole("textbox", { name: /^Your words/ }).fill("BACK WAVES");
      await studio.getByRole("button", { name: "ϟ Bolt", exact: true }).click();
      await studio.getByRole("button", { name: "Studio fabric Lavender", exact: true }).click();
      await expect(studio.getByRole("button", { name: "Studio back view", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(studio.getByRole("button", { name: "Give it a shake", exact: true })).toBeDisabled();
      await noOverflow(page, "Mobile customizer at 390px");
      await studio.screenshot({ path: path.join(artifacts, "customizer-mobile.png"), animations: "disabled", style: ".site-header, .skip-link, nextjs-portal { visibility: hidden; }" });
      await page.setViewportSize({ width: 320, height: 780 });
      await noOverflow(page, "Mobile customizer at 320px");
      await studio.getByRole("button", { name: "Choose size & add to bag", exact: true }).click();
      const modal = page.getByRole("dialog", { name: "Choose Essential Heavyweight", exact: true });
      await modal.getByText("Personalize text & logo", { exact: true }).click();
      await modal.getByRole("textbox", { name: /^Your words/ }).fill("MOBILE EDIT");
      await modal.getByRole("button", { name: "Front design", exact: true }).click();
      await expect(modal.getByRole("textbox", { name: /^Your words/ })).toHaveValue("FRONT WAVES");
      await modal.getByRole("button", { name: "Back design", exact: true }).click();
      await expect(modal.getByRole("textbox", { name: /^Your words/ })).toHaveValue("MOBILE EDIT");
      await modal.getByRole("button", { name: /^Add to bag/ }).click();
      await modal.getByRole("button", { name: "Close product", exact: true }).click();
      await expect(studio.getByRole("textbox", { name: /^Your words/ })).toHaveValue("MOBILE EDIT");
      await page.getByRole("button", { name: "Open bag, 1 items", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Shopping bag", exact: true })).toContainText("MOBILE EDIT");
    } finally { await mobile.close(); }
  });
};
