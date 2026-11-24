import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/Users/omen/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell" });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
for (const u of process.argv.slice(2)) {
  await p.goto("http://localhost:5173" + u); await p.waitForTimeout(6000); await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
  const r = await p.evaluate(() => {
    const W = document.documentElement.clientWidth; const bodyW = document.body.scrollWidth;
    const out = [];
    for (const el of document.querySelectorAll("body *")) { const rc = el.getBoundingClientRect(); if (rc.right > W + 1 && rc.width > 0 && !el.closest(".cuisine-row,.city-tabs,.menu-toolbar__cats")) out.push(`${el.tagName}.${String(el.className).slice(0, 40)} right=${Math.round(rc.right)}`); }
    return { W, bodyW, sw: document.documentElement.scrollWidth, out: out.slice(0, 8) };
  });
  console.log(u, JSON.stringify(r));
}
await b.close();
