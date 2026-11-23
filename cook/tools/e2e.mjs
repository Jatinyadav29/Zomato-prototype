import { chromium } from "playwright";
const EXE = "/Users/omen/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const B = "http://localhost:5173", RID = "687a3bd20002000000000000";
const b = await chromium.launch({ executablePath: EXE });
const log = (...a) => console.log("•", ...a);
const errs = [];
async function ctxFor(email) {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await c.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/login");
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', "password123");
  await p.click('button:has-text("Log in")');
  await p.waitForURL((u) => !u.pathname.startsWith("/login"));
  return p;
}
// customer: add 2 items, checkout
const cu = await ctxFor("customer@foodhub.com");
log("customer landed on", new URL(cu.url()).pathname);
await cu.goto(`${B}/r/${RID}`);
await cu.waitForSelector(".add-btn:not([disabled])");
const adds = cu.locator(".add-btn:not([disabled])");
await adds.nth(0).click(); await adds.nth(1).click();
await cu.locator(".menu-item .qty button[aria-label='Add one']").first().click();
log("bag badge:", await cu.locator(".bag-btn__count").textContent());
await cu.click("text=Go to checkout");
await cu.click(".pay-option:has-text('Card')");
const [resp] = await Promise.all([
  cu.waitForResponse((r) => r.url().includes("/api/orders") && r.request().method() === "POST"),
  cu.click("button:has-text('Place order')"),
]);
const { order } = await resp.json();
log("order", resp.status(), order._id, "total", order.totalAmount, order.paymentMethod);
await cu.waitForSelector(".placed__card");
log("success screen:", (await cu.locator(".placed__card h1").textContent()).trim());
// reload keeps session (refresh cookie)
await cu.reload(); await cu.waitForTimeout(1500);
log("after reload account btn:", (await cu.locator(".account__btn").textContent()).trim());

// owner: move order placed -> preparing -> delivered from live board
const ow = await ctxFor("owner@foodhub.com");
log("owner landed on", new URL(ow.url()).pathname);
await ow.goto(`${B}/owner/${RID}/orders`);
await ow.waitForSelector(".lane--placed .ticket", { timeout: 120000 });
const t = ow.locator(".lane--placed .ticket").first();
log("first new ticket:", (await t.locator("header b").textContent()));
let r1 = await Promise.all([ow.waitForResponse((r) => r.url().includes(`/orders/${order._id}/status`)), t.locator("button:has-text('Start cooking')").click()]);
log("-> preparing", r1[0].status());
await ow.waitForTimeout(500);
// deliver via API in the page context (ticket list reload is slow)
const st = await ow.evaluate(async (id) => {
  const tok = await (await fetch("/api/auth/refresh", { method: "POST" })).json();
  const r = await fetch(`/api/orders/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok.accessToken }, body: JSON.stringify({ status: "delivered" }) });
  return r.status + " " + (await r.json()).order?.status;
}, order._id);
log("-> delivered", st);
// customer reviews via API-equivalent call from UI client, then duplicate -> 409
const rv = await cu.evaluate(async (id) => {
  const tok = await (await fetch("/api/auth/refresh", { method: "POST" })).json();
  const h = { "Content-Type": "application/json", Authorization: "Bearer " + tok.accessToken };
  const a = await fetch("/api/reviews", { method: "POST", headers: h, body: JSON.stringify({ orderId: id, rating: 5, comment: "E2E test review from the frontend run" }) });
  const ja = await a.json();
  const c = await fetch("/api/reviews", { method: "POST", headers: h, body: JSON.stringify({ orderId: id, rating: 4 }) });
  return [a.status, ja.review?._id, c.status, (await c.json()).message];
}, order._id);
log("review", rv);
log("page errors:", errs.length ? errs : "none");
await b.close();
