// Still renderer for the cook loop.
// node shots.mjs <round> [S01,S02,...]
// Writes cook/stills/rNN/SXX.png (1440 wide, full page) and SXXm.png (390 wide) where noted.
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const round = String(process.argv[2] || "1").padStart(2, "0");
const only = process.argv[3]?.split(",");
const out = path.join(here, "..", "stills", `r${round}`);
mkdirSync(out, { recursive: true });

const BASE = "http://localhost:5173";
const RID = "687a3bd20002000000000000"; // owner@foodhub.com flagship, Bhopal
const EXE = "/Users/omen/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell";

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password123");
  await page.click('button:has-text("Log in")');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

async function settle(page, ms = 800) {
  await page.waitForLoadState("networkidle", { timeout: 180000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

const CART = {
  restaurant: { _id: RID, name: "Annapurna Tandoor House", area: "New Market", city: "Bhopal", cuisines: ["North Indian", "Desserts"], isOpen: true },
  items: [],
};

const shots = {
  S01: { role: null, url: "/?city=Bhopal", mobile: true },
  S02: { role: null, url: `/r/${RID}`, mobile: true },
  S03: { role: "customer@foodhub.com", url: "/checkout", cart: true },
  S04: { role: "customer@foodhub.com", url: "/orders", wait: 240000 },
  S05: { role: null, url: "/login" },
  S06: { role: "owner@foodhub.com", url: `/owner/${RID}` },
  S07: { role: "owner@foodhub.com", url: `/owner/${RID}/orders`, wait: 120000 },
  S08: { role: "owner@foodhub.com", url: `/owner/${RID}/menu` },
  S09: { role: "owner@foodhub.com", url: "/owner" },
};

const browser = await chromium.launch({ executablePath: EXE });
// Build a real cart from the live menu so S03 shows real items.
const menu = await (await fetch(`http://localhost:3000/api/restaurants/${RID}/menu`)).json();
CART.items = menu.menuItems.filter((m) => m.isAvailable).slice(0, 4).map((m, i) => ({ menuItemId: m._id, name: m.name, price: m.price, isVeg: m.isVeg, quantity: (i % 2) + 1 }));

for (const [name, s] of Object.entries(shots)) {
  if (only && !only.includes(name)) continue;
  for (const mobile of s.mobile ? [false, true] : [false]) {
    const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(s.wait || 60000);
    if (s.role) await login(page, s.role);
    if (s.cart) await page.evaluate((c) => localStorage.setItem("foodhub.cart.v1", JSON.stringify(c)), CART);
    const t0 = Date.now();
    await page.goto(BASE + s.url);
    await settle(page);
    if (s.wait) await page.waitForSelector(".slow-loader", { state: "detached", timeout: s.wait }).catch(() => {});
    // scroll through so lazy images load before the full-page capture
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
    });
    await settle(page, 600);
    const file = path.join(out, `${name}${mobile ? "m" : ""}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(file, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
    await ctx.close();
  }
}
await browser.close();
