// node crop.mjs in.png out.png y height  -> crops a band of a tall still (for close looks)
import { chromium } from "playwright"; import { readFileSync } from "fs";
const [i, o, y, h] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/Users/omen/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell" });
const p = await b.newPage({ viewport: { width: 390, height: Number(h) } });
await p.setContent(`<body style="margin:0;overflow:hidden"><img style="display:block;margin-top:-${y}px" src="data:image/png;base64,${readFileSync(i).toString("base64")}"></body>`);
await p.screenshot({ path: o }); await b.close();
