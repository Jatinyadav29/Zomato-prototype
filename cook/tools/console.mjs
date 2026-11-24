import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/Users/omen/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell" });
const p = await b.newPage();
p.on("console", (m) => (m.type() === "error" || m.type() === "warning") && console.log(m.type(), m.text().slice(0, 400)));
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.goto("http://localhost:5173" + (process.argv[2] || "/"));
await p.waitForTimeout(3000);
await b.close();
