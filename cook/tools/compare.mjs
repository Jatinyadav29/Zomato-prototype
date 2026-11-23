// node compare.mjs <round> pairs like S01:R01 S02:R03 ... -> cook/compare/rNN/SXX.jpg (ref left, render right, same height)
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const round = String(process.argv[2]).padStart(2, "0");
const pairs = process.argv.slice(3).map((p) => p.split(":"));
const outDir = path.join(here, "..", "compare", `r${round}`);
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ executablePath: "/Users/omen/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell" });
const pg = await b.newPage({ viewport: { width: 1600, height: 1000 } });
for (const [shot, ref] of pairs) {
  const r = readFileSync(path.join(here, "..", "refs", `${ref}.jpg`)).toString("base64");
  const s = readFileSync(path.join(here, "..", "stills", `r${round}`, `${shot}.png`)).toString("base64");
  await pg.setContent(`<body style="margin:0;background:#222;display:flex;gap:16px;padding:16px;align-items:flex-start;font:20px sans-serif;color:#fff">
  <figure style="margin:0;flex:1"><figcaption>REFERENCE ${ref}</figcaption><img style="width:100%;display:block" src="data:image/jpeg;base64,${r}"></figure>
  <figure style="margin:0;flex:1"><figcaption>RENDER ${shot}</figcaption><img style="width:100%;display:block" src="data:image/png;base64,${s}"></figure></body>`);
  await pg.waitForTimeout(200);
  const f = path.join(outDir, `${shot}.jpg`);
  await pg.screenshot({ path: f, fullPage: true, type: "jpeg", quality: 80 });
  console.log(f);
}
await b.close();
