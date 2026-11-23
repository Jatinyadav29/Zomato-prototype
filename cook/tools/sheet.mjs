// contact sheet: node sheet.mjs out.png img1 img2 ...
import { chromium } from "playwright";
import { readFileSync } from "fs";
import path from "path";
const [out, ...imgs] = process.argv.slice(2);
const cells = imgs.map(p => `<figure><img src="data:image/jpeg;base64,${readFileSync(p).toString("base64")}"><figcaption>${path.basename(p)}</figcaption></figure>`).join("");
const html = `<body style="margin:0;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;background:#222;font:12px sans-serif;color:#fff">${cells}</body><style>figure{margin:0}img{width:100%;height:200px;object-fit:cover;display:block}</style>`;
const b = await chromium.launch({ executablePath: "/Users/omen/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell" }); const pg = await b.newPage({ viewport: { width: 1400, height: 800 } });
await pg.setContent(html); await pg.waitForTimeout(300); await pg.screenshot({ path: out, fullPage: true }); await b.close();
