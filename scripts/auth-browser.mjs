import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";
import { startTestBackend } from "./test-backend.mjs";

const dir = await mkdtemp(path.join(tmpdir(), "once-browser-"));
const origin = "http://localhost:3101",
  password = randomBytes(24).toString("hex");
const testEnv = {
  SESSION_SECRET: randomBytes(32).toString("hex"),
  ADMIN_USERNAME: "editor@example.com",
  ADMIN_PASSWORD: password,
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
};
const backend = await startTestBackend({
  dir,
  origin,
  port: 4101,
  env: testEnv,
});
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    process.env.ONCE_BROWSER_DEV ? "dev" : "start",
    "-p",
    "3101",
  ],
  { env: { ...backend.env }, stdio: ["ignore", "pipe", "pipe"] },
);
let output = "",
  browser;
server.stdout.on("data", (d) => (output += d));
server.stderr.on("data", (d) => (output += d));
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(origin + "/en")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, output);
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  await context.route("https://images.unsplash.com/**", (route) =>
    route.abort(),
  );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) =>
    errors.push({ page: page.url(), message: error.message }),
  );
  await page.goto(origin + "/en");
  await expect(page.locator(".intro")).toHaveCount(0);
  await expect(page.locator(".discovery")).toHaveCount(0);
  await expect(page.locator("header .header-country select")).toHaveValue(
    "all",
  );
  await expect(page.locator("header .header-genre select")).toBeVisible();
  await expect(page.locator('header form[role="search"]')).toBeVisible();
  await expect(page.locator("header .language-select")).toHaveCount(0);
  for (const [country, locale] of [
    ["FR", "fr"],
    ["DK", "da"],
    ["SE", "sv"],
    ["BE", "fr-BE"],
    ["IE", "en"],
    ["GB", "en"],
  ]) {
    await page.locator(".header-country select").selectOption(country);
    await expect(page).toHaveURL(
      new RegExp(`/${locale}\\?country=${country}$`),
    );
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator(".header-country select")).toHaveValue(country);
  }
  await page.locator(".header-country select").selectOption("all");
  await expect(page).toHaveURL(origin + "/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.locator(".title-button").filter({ hasText: "Kyoto: Đi chậm" }),
  ).toBeVisible();
  await expect(
    page.locator(".title-button").filter({ hasText: "Kyoto: slowing down" }),
  ).toBeVisible();
  await page.locator(".feature-copy .title-button").click();
  await expect(page).toHaveURL(/\/vi\/posts\/kyoto\?country=all$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".article-page")).toHaveAttribute("lang", "vi");
  await expect(page.locator(".header-country select")).toHaveValue("all");
  await page
    .getByRole("link", { name: "Back to stories", exact: true })
    .click();
  await expect(page).toHaveURL(origin + "/en");
  await page.locator(".header-genre select").selectOption("Văn hóa");
  await expect(page.locator(".header-genre select")).toHaveValue("Văn hóa");
  await expect(
    page.locator(".title-button").filter({ hasText: "Đà Lạt" }),
  ).toHaveCount(0);
  await page.locator(".header-genre select").selectOption("all");
  await expect(page).toHaveURL(origin + "/en");
  await page.locator(".header-search input").fill("Da Lat");
  await page.locator(".header-search input").press("Enter");
  await expect(page).toHaveURL(/q=Da\+Lat/);
  await expect(
    page.locator(".title-button").filter({ hasText: "Da Lat" }),
  ).toBeVisible();
  await expect(
    page.locator(".title-button").filter({ hasText: "Kyoto" }),
  ).toHaveCount(0);
  await page.goto(origin + "/en");
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/header-desktop.png" });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("tab", { name: "Sign in", exact: true }),
  ).toHaveAttribute("data-state", "active");
  const input = dialog.getByLabel("Password", { exact: true });
  await input.fill("Visibility-example");
  await expect(input).toHaveAttribute("type", "password");
  await dialog
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(input).toHaveAttribute("type", "text");
  await dialog
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(input).toHaveAttribute("type", "password");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await dialog.getByRole("tab", { name: "Sign up", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "A new story starts here." }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Continue with Google" }),
  ).toBeDisabled();
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/auth-desktop.png" });
  await dialog.getByLabel("Your name", { exact: true }).fill("Browser Reader");
  await dialog.getByLabel("Username", { exact: true }).fill("browser_reader");
  const readerPassword = randomBytes(18).toString("hex");
  await dialog.getByLabel("Password", { exact: true }).fill(readerPassword);
  await dialog
    .getByLabel("Confirm password", { exact: true })
    .fill(readerPassword + "x");
  await dialog.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Passwords do not match.");
  await dialog
    .getByLabel("Confirm password", { exact: true })
    .fill(readerPassword);
  await dialog.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".account-control")).toBeVisible();
  await page.locator(".account-control button").hover();
  await expect(page.getByRole("link", { name: "Admin dashboard" })).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await dialog.getByLabel("Username", { exact: true }).fill("browser_reader");
  await dialog.getByLabel("Password", { exact: true }).fill(readerPassword);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.goto(origin + "/en/admin");
  await expect(
    page.getByText("An editor account is required to access the dashboard."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Activity overview" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sign in with another account" })
    .click();
  await expect(dialog).toBeVisible();
  await dialog
    .getByLabel("Username", { exact: true })
    .fill("editor@example.com");
  await dialog.getByLabel("Password", { exact: true }).fill(password);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Activity overview" }),
  ).toBeVisible();
  await expect(dialog).toBeHidden();
  await page
    .locator(".sidebar")
    .evaluate((node) => (node.dataset.persistence = "kept"));
  await page.getByRole("link", { name: "Write a story", exact: true }).click();
  await expect(page).toHaveURL(origin + "/en/admin/posts/new");
  await expect(dialog).toBeHidden();
  await expect(page.locator(".sidebar")).toHaveAttribute(
    "data-persistence",
    "kept",
  );
  await expect(page.getByLabel("Author", { exact: true })).toHaveValue(
    "Once Upon Today",
  );
  await expect(
    page.getByLabel("Country / language", { exact: true }),
  ).toHaveValue("GB:en");
  await page
    .getByLabel("Country / language", { exact: true })
    .selectOption("FR:fr");
  await page.getByLabel("Title", { exact: true }).fill("Browser rich story");
  await page
    .getByLabel("Short description", { exact: true })
    .fill("A rich story with uploaded images and more than 30,000 characters.");
  const richEditor = page.getByRole("textbox", {
    name: "Content",
    exact: true,
  });
  await richEditor.fill("A formatted introduction");
  await richEditor.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(richEditor.locator("strong")).toHaveText(
    "A formatted introduction",
  );
  const fixture = await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#2c6653" },
  })
    .png()
    .toBuffer();
  await page
    .locator(".post-editor-settings input[type=file]")
    .setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: fixture,
    });
  await expect(
    page.locator(".post-editor-settings .upload-preview img"),
  ).toHaveAttribute("src", /^\/api\/uploads\//);
  await page.screenshot({ path: "artifacts/editor-desktop.png" });
  await richEditor.press("ControlOrMeta+End");
  await richEditor.press("Enter");
  const longBody = "A long paragraph about today. ".repeat(1400);
  await page.keyboard.insertText(longBody);
  await page.getByRole("button", { name: "Insert image", exact: true }).click();
  const imageDialog = page.getByRole("dialog", {
    name: "Insert image",
    exact: true,
  });
  await expect(imageDialog).toBeVisible();
  await imageDialog
    .locator("input[type=file]")
    .setInputFiles({
      name: "inline.png",
      mimeType: "image/png",
      buffer: fixture,
    });
  await expect(imageDialog.locator(".upload-preview img")).toHaveAttribute(
    "src",
    /^\/api\/uploads\//,
  );
  await imageDialog
    .getByLabel("Image description", { exact: true })
    .fill("An inline image");
  await imageDialog
    .getByRole("button", { name: "Insert", exact: true })
    .click();
  await expect(richEditor.locator("img")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Save and publish", exact: true })
    .click();
  await expect(page).toHaveURL(origin + "/en/admin/posts");
  await expect(page.locator(".sidebar")).toHaveAttribute(
    "data-persistence",
    "kept",
  );
  const saved = (
    await (await page.request.get(origin + "/api/posts")).json()
  ).posts.find((p) => p.title === "Browser rich story");
  assert.ok(saved.content.length > 30000);
  assert.equal(saved.contentFormat, "html");
  assert.equal(saved.country, "FR");
  assert.equal(saved.language, "fr");
  assert.equal(saved.author, "Once Upon Today");
  assert.match(saved.image, /^\/api\/uploads\//);
  await page
    .getByRole("link", { name: "Edit: Browser rich story", exact: true })
    .click();
  await expect(page).toHaveURL(origin + `/en/admin/posts/${saved.id}/edit`);
  await expect(
    page.getByLabel("Country / language", { exact: true }),
  ).toHaveValue("FR:fr");
  await expect(
    page.getByRole("textbox", { name: "Content", exact: true }),
  ).toContainText("A long paragraph about today.");
  await expect(
    page
      .getByRole("textbox", { name: "Content", exact: true })
      .locator("strong")
      .first(),
  ).toContainText("A formatted introduction");
  const editorMobile = await browser.newContext({
    storageState: await context.storageState(),
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  await editorMobile.route("https://images.unsplash.com/**", (route) =>
    route.abort(),
  );
  const editorPhone = await editorMobile.newPage();
  editorPhone.on("pageerror", (error) =>
    errors.push({ page: editorPhone.url(), message: error.message }),
  );
  await editorPhone.goto(origin + "/en/admin/posts/new");
  await expect(
    editorPhone.getByRole("textbox", { name: "Content", exact: true }),
  ).toBeVisible();
  assert.ok(
    await editorPhone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile editor must not overflow",
  );
  await editorPhone.screenshot({ path: "artifacts/editor-mobile.png" });
  await editorMobile.close();
  const mobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    deviceScaleFactor: 1,
  });
  await mobile.route("https://images.unsplash.com/**", (route) =>
    route.abort(),
  );
  const phone = await mobile.newPage();
  phone.on("pageerror", (error) =>
    errors.push({ page: phone.url(), message: error.message }),
  );
  await phone.goto(origin + "/vi");
  assert.ok(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile page must not overflow horizontally",
  );
  await expect(phone.locator("header .header-country select")).toHaveValue(
    "VN",
  );
  await expect(phone.locator("header .header-search input")).toBeVisible();
  await phone.screenshot({ path: "artifacts/header-mobile.png" });
  await phone.getByRole("button", { name: "Đổi giao diện sáng / tối" }).click();
  await expect(phone.locator("html")).toHaveAttribute("data-theme", "dark");
  await phone.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const mobileDialog = phone.getByRole("dialog");
  await expect(mobileDialog).toBeVisible();
  await mobileDialog.getByRole("tab", { name: "Đăng ký", exact: true }).click();
  await expect(
    mobileDialog.getByLabel("Nhập lại mật khẩu", { exact: true }),
  ).toBeVisible();
  const box = await mobileDialog.boundingBox();
  assert.ok(
    box.x >= 0 && box.x + box.width <= 375,
    "Mobile dialog must fit viewport",
  );
  await phone.screenshot({ path: "artifacts/auth-mobile.png" });
  await mobileDialog
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Mat-khau-vi-du");
  await mobileDialog
    .getByRole("button", { name: "Hiện mật khẩu", exact: true })
    .first()
    .click();
  await expect(
    mobileDialog.getByLabel("Mật khẩu", { exact: true }),
  ).toHaveAttribute("type", "text");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: editor routes with persistent sidebar, combined country/language, default author, rich text >40k, cover/inline uploads, publish/edit round trip, mobile editor, header filters, authentication and dark theme. Screenshots in artifacts/, including editor-desktop.png and editor-mobile.png.",
  );
} finally {
  if (browser) await browser.close();
  server.kill();
  await new Promise((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once("exit", resolve);
  });
  await backend.stop();
  assert.equal(path.dirname(path.resolve(dir)), path.resolve(tmpdir()));
  assert.ok(path.basename(dir).startsWith("once-browser-"));
  await rm(dir, { recursive: true, force: true });
}
