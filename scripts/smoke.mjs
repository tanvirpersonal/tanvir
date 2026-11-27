#!/usr/bin/env node
/**
 * Browser smoke test for the live editor (index.html).
 *
 *   npm run smoke            # exits 1 on any page error / same-origin 404 / missing canvas
 *   SMOKE_SHOT=out.png npm run smoke   # also saves a screenshot
 *
 * - Serves the repo over a local static server.
 * - Rewrites the import-map CDN (unpkg three@0.181.1) to node_modules/three,
 *   so it works offline / behind a proxy (run `npm install` first).
 * - Needs Playwright with Chromium (`npx playwright install chromium` if missing).
 *
 * Run this before pushing any change to files the live site loads
 * (core/, ui/, rocket/, objects/, main.js, index.html).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const threeDir = path.join(root, "node_modules", "three");
const require = createRequire(import.meta.url);

let playwright;
try { playwright = require("playwright"); } catch { playwright = (await import("playwright")).default; }

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };

function serveFile(res, file) {
    fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); res.end("not found"); return; }
        res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
        res.end(buf);
    });
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    let p = decodeURIComponent(url.pathname);
    if (p.startsWith("/tanvir/")) p = p.slice("/tanvir".length); // mimic GitHub Pages base path
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    serveFile(res, file);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/tanvir/`;

if (!fs.existsSync(threeDir)) {
    console.error("node_modules/three missing — run `npm install` first");
    process.exit(2);
}

const problems = [];
const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.route(/https:\/\/unpkg\.com\/three@[^/]+\/(.*)$/, (route, request) => {
    const rel = request.url().replace(/^https:\/\/unpkg\.com\/three@[^/]+\//, "").split("?")[0];
    const file = path.join(threeDir, rel);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
    route.fulfill({ status: 200, contentType: "text/javascript", body: fs.readFileSync(file) });
});
// Block every other external host so the run is deterministic.
await page.route(url => !url.href.startsWith(base) && !/unpkg\.com\/three@/.test(url.href), route => route.abort());

page.on("pageerror", err => problems.push(`pageerror: ${err.message}`));
page.on("console", msg => { if (msg.type() === "error" && !/net::ERR_FAILED|Failed to load resource/.test(msg.text())) problems.push(`console.error: ${msg.text()}`); });
page.on("response", resp => { if (resp.url().startsWith(base) && resp.status() >= 400) problems.push(`HTTP ${resp.status()}: ${resp.url().slice(base.length)}`); });

await page.goto(base, { waitUntil: "load" });
await page.waitForTimeout(2500);

const state = await page.evaluate(() => ({
    canvas: !!document.querySelector("#app canvas"),
    objects: document.getElementById("objectCount")?.textContent ?? null,
    fps: document.getElementById("fpsCounter")?.textContent ?? null,
    status: document.getElementById("statusText")?.textContent ?? null,
}));
if (!state.canvas) problems.push("no <canvas> inside #app");
if (!state.fps || state.fps === "--") problems.push(`render loop not reporting FPS (fpsCounter=${state.fps})`);

if (process.env.SMOKE_SHOT) await page.screenshot({ path: process.env.SMOKE_SHOT });
await browser.close();
server.close();

console.log("smoke state:", JSON.stringify(state));
if (problems.length) {
    console.error(`SMOKE FAILED (${problems.length}):\n  - ${problems.join("\n  - ")}`);
    process.exit(1);
}
console.log("SMOKE OK");
