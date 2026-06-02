import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const outputDir =
  process.env.SCREENSHOT_DIR ||
  path.resolve(frontendRoot, "../docs/screenshots");

const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}/`;
const INVITE_URL = `${PREVIEW_URL}?id=screenshot-demo`;
const ADMIN_URL = `${PREVIEW_URL}admin.html`;

const mockInvite = {
  guests: [
    {
      id: "guest-1",
      name: "Alex Example",
      is_attending: null,
      dietary_restriction: "",
    },
  ],
  require_parking: null,
  attend_solemnisation: null,
};

const mockAdminInvites = [
  {
    id: "0123456789012345678",
    guests: [
      {
        id: "guest-1",
        name: "Jane Doe",
        is_attending: true,
        dietary_restriction: "Vegetarian",
        last_updated: "2026-06-01T10:00:00Z",
      },
      {
        id: "guest-2",
        name: "John Doe",
        is_attending: false,
        dietary_restriction: "",
        last_updated: "2026-06-01T10:00:00Z",
      },
    ],
    is_sent: true,
    require_parking: true,
    attend_solemnisation: false,
  },
];

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startPreview() {
  const child = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(PREVIEW_PORT)], {
    cwd: frontendRoot,
    stdio: "pipe",
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  return child;
}

async function mockInviteApi(page) {
  await page.route("**/guest?id=*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockInvite),
    });
  });
}

async function mockAdminApi(page) {
  await page.route("**/admin/invites**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 405, body: "Method not allowed" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockAdminInvites),
    });
  });
}

async function captureSet(browser, { name, viewport, isMobile }) {
  const context = await browser.newContext({
    viewport,
    ...(isMobile ? devices["iPhone 13"] : {}),
  });
  const page = await context.newPage();
  await mockInviteApi(page);

  await page.goto(INVITE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".nav-fab");
  await page.screenshot({
    path: path.join(outputDir, `${name}-top.png`),
    fullPage: false,
  });

  await page.evaluate(() => window.scrollTo(0, 120));
  await page.waitForTimeout(350);
  await page.screenshot({
    path: path.join(outputDir, `${name}-scrolled-menu.png`),
    fullPage: false,
  });

  await page.locator(".nav-fab").click();
  await page.waitForSelector(".nav-drawer.is-open");
  await page.waitForTimeout(350);
  await page.screenshot({
    path: path.join(outputDir, `${name}-drawer.png`),
    fullPage: false,
  });

  await context.close();
}

async function captureAdminSet(browser, { name, viewport, isMobile }) {
  const context = await browser.newContext({
    viewport,
    ...(isMobile ? devices["iPhone 13"] : {}),
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await context.addInitScript(() => {
    sessionStorage.setItem("admin_token", "screenshot-token");
  });

  const page = await context.newPage();
  await mockAdminApi(page);

  await page.goto(ADMIN_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".admin-invite-card");
  await page.getByRole("button", { name: "Copy link" }).click();
  await page.getByRole("button", { name: "Copied!" }).waitFor();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(outputDir, `${name}-admin-copy.png`),
    fullPage: false,
  });

  await context.close();
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const preview = startPreview();
  try {
    await waitForServer(PREVIEW_URL);

    const browser = await chromium.launch();

    await captureSet(browser, {
      name: "desktop",
      viewport: { width: 1280, height: 900 },
      isMobile: false,
    });

    await captureSet(browser, {
      name: "mobile",
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });

    await captureAdminSet(browser, {
      name: "desktop",
      viewport: { width: 1280, height: 900 },
      isMobile: false,
    });

    await captureAdminSet(browser, {
      name: "mobile",
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });

    await browser.close();
    console.log(`Screenshots saved to ${outputDir}`);
  } finally {
    preview.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
