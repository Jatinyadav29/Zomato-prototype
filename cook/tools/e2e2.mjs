import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/Users/omen/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell" });
const p = await b.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const B = "http://localhost:5173", RID = "687a3bd20002000000000000";
await p.goto(B + "/login"); await p.click("text=Owner"); await p.click('button:has-text("Log in")'); await p.waitForURL(B + "/owner");
console.log("kitchens:", await p.locator(".kitchen").count());
await p.goto(`${B}/owner/${RID}/menu`); await p.waitForSelector(".mm-row");
const sw = p.locator(".mm-row .switch").first();
const before = await sw.getAttribute("aria-checked");
await Promise.all([p.waitForResponse((r) => r.request().method() === "PATCH"), sw.click()]);
await p.waitForTimeout(300);
const mid = await p.locator(".mm-row .switch").first().getAttribute("aria-checked");
await Promise.all([p.waitForResponse((r) => r.request().method() === "PATCH"), p.locator(".mm-row .switch").first().click()]);
await p.waitForTimeout(300);
console.log("availability toggle:", before, "->", mid, "->", await p.locator(".mm-row .switch").first().getAttribute("aria-checked"));
// details page renders form
await p.goto(`${B}/owner/${RID}/edit`); await p.waitForSelector(".rform__form");
console.log("edit form name:", await p.inputValue(".rform__form input"));
// 403 guard: someone else's restaurant
const other = (await (await fetch("http://localhost:3000/api/restaurants?city=Delhi&limit=1")).json()).restaurants[0]._id;
await p.goto(`${B}/owner/${other}`); await p.waitForTimeout(1500);
console.log("foreign kitchen:", (await p.locator(".error-state p").textContent().catch(() => "no error state")));
// register duplicate -> 409 message
const c = await b.newPage(); await c.goto(B + "/register");
await c.fill("input[autocomplete=name]", "X"); await c.fill("input[type=email]", "customer@foodhub.com"); await c.fill("input[type=password]", "password123");
await c.click("button:has-text('Create account')"); await c.waitForSelector(".form__error");
console.log("register dup:", await c.textContent(".form__error"));
// customer route guard while logged out
await c.goto(B + "/orders"); await c.waitForTimeout(1200); console.log("logged-out /orders ->", new URL(c.url()).pathname);
console.log("errors:", errs.length ? errs : "none");
await b.close();
