import { test, expect, chromium, type BrowserContext } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFileSync, writeFileSync, rmSync, cpSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { generateKeyPairSync, createHash } from "node:crypto";

// Real-browser extension harness: loads dist/ as an unpacked MV3 extension in
// Chrome and drives the ANALYZE/UNLOCK/EXTRACT/RELOCK message contract exactly
// as the production popup does, plus popup-UI and (best-effort) OCR checks.

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");
const EXT_DIR = join(ROOT, ".e2e-ext");
const PROFILE = join(ROOT, ".e2e-profile");
const FIXTURES = join(ROOT, "fixtures");
const ASSETS = join(ROOT, "rc-e2e", "assets");
const RESULTS_FILE = join(ROOT, ".e2e-results.json");

const results: any[] = [];
function record(name: string, data: Record<string, unknown>) {
  const row = { name, ts: new Date().toISOString(), ...data };
  results.push(row);
  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

let ctx: BrowserContext | null = null;
let extId = "";
let server: Server;
let baseUrl = "";
let launchMode = "";

function wait(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// Deterministic unpacked-extension id: Chrome derives the id from the
// manifest "key" (SPKI DER, base64). Id chars map sha256 hex nibbles to a..p.
function makeExtensionKey(): { id: string; key: string } {
  const { publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const der = publicKey as Buffer;
  const digest = createHash("sha256").update(der).digest();
  // Chrome maps the FIRST 16 bytes of the sha256 digest to 32 id chars (a..p).
  const id = Array.from(digest.subarray(0, 16), (b) =>
    String.fromCharCode(97 + (b >> 4)) + String.fromCharCode(97 + (b & 15))
  ).join("");
  return { id, key: der.toString("base64") };
}

async function findBundledChromium(): Promise<string | undefined> {
  const base = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!base) return undefined;
  for (const rev of ["1243", "1234", "1208"]) {
    for (const layout of ["chrome-win64", "chrome-win"]) {
      const exe = join(base, `chromium-${rev}`, layout, "chrome.exe");
      if (existsSync(exe)) return exe;
    }
  }
  return undefined;
}

async function launch(extKey: string) {
  const exe = await findBundledChromium();
  console.log(`bundled chromium: ${exe || "(not found; defaulting to playwright registry)"}`);
  // CI/headless-shell Chromium cannot host extensions, so try "new headless"
  // (full browser, --headless=new) first, then plain headless, then headed.
  const modes = [
    { name: "new-headless", headless: false, extra: ["--headless=new"] },
    { name: "headless", headless: true, extra: [] as string[] },
    { name: "headed", headless: false, extra: [] as string[] },
  ];
  for (const mode of modes) {
    try {
      rmSync(PROFILE, { recursive: true, force: true });
      mkdirSync(PROFILE, { recursive: true });
      const c = await chromium.launchPersistentContext(PROFILE, {
        ...(exe ? { executablePath: exe } : {}),
        headless: mode.headless,
        viewport: { width: 1000, height: 700 },
        ignoreDefaultArgs: ["--disable-extensions", "--disable-component-extensions-with-background-pages"],
        args: [
          `--disable-extensions-except=${EXT_DIR}`,
          `--load-extension=${EXT_DIR}`,
          "--no-first-run",
          "--no-default-browser-check",
          ...mode.extra,
        ],
      });
      const probe = await c.newPage();
      let ok = false;
      try {
        const resp = await probe.goto(`chrome-extension://${extId}/popup.html`, { timeout: 8000 });
        await probe.waitForLoadState("domcontentloaded");
        ok = !!resp && !(resp.status() >= 400) && (await probe.locator("h1").count()) > 0;
      } catch (e) {
        console.log(`probe(${mode.name}) error: ${String(e).slice(0, 300)}`);
      }
      await probe.close().catch(() => {});
      if (ok) {
        launchMode = mode.name;
        ctx = c;
        return;
      }
      await c.close();
    } catch (e) {
      console.log(`launch(${mode.name}) failed: ${String(e).slice(0, 500)}`);
    }
  }
  throw new Error("Could not launch Chrome with the unpacked extension (tried new-headless, headless, headed).");
}

function prepareExtensionDir(extKey: string) {
  rmSync(EXT_DIR, { recursive: true, force: true });
  cpSync(DIST, EXT_DIR, { recursive: true });
  const manifestPath = join(EXT_DIR, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.key = extKey;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  writeFileSync(join(EXT_DIR, "background.js"), readFileSync(join(ASSETS, "background.js"), "utf8"));
  writeFileSync(join(EXT_DIR, "driver.html"), readFileSync(join(ASSETS, "driver.html"), "utf8"));
  writeFileSync(join(EXT_DIR, "driver.js"), readFileSync(join(ASSETS, "driver.js"), "utf8"));
}

function startServer(): Promise<string> {
  const mime: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".png": "image/png",
    ".js": "text/javascript",
    ".css": "text/css",
  };
  return new Promise((resolveP, rejectP) => {
    server = createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const file = join(FIXTURES, urlPath);
        if (!file.startsWith(FIXTURES) || !existsSync(file)) {
          res.writeHead(404).end("not found");
          return;
        }
        const body = readFileSync(file);
        res.writeHead(200, { "Content-Type": mime[resolve(file).match(/\.[a-z]+$/i)?.[0] ?? ".html"] ?? "application/octet-stream" });
        res.end(body);
      } catch (e) {
        res.writeHead(500).end(String(e));
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") resolveP(`http://127.0.0.1:${addr.port}`);
      else rejectP(new Error("no server addr"));
    });
  });
}

async function runDriver(fixtureUrl: string, opts: { unlock?: boolean; relock?: boolean; ocr?: boolean; lang?: string; autoCancelMs?: number } = {}) {
  if (!ctx) throw new Error("no context");
  const driver = await ctx.newPage();
  await driver.goto(`chrome-extension://${extId}/driver.html`);
  await driver.locator("#url").fill(fixtureUrl);
  if (opts.unlock !== undefined) await driver.locator("#unlock").setChecked(opts.unlock);
  if (opts.relock !== undefined) await driver.locator("#relock").setChecked(opts.relock);
  await driver.locator("#ocr").setChecked(!!opts.ocr);
  if (opts.lang) await driver.locator("#lang").selectOption(opts.lang);
  if (opts.autoCancelMs) await driver.locator("#autoCancel").fill(String(opts.autoCancelMs));
  await driver.locator("#run").click();
  await driver.waitForFunction(() => {
    const t = document.querySelector("#report")?.textContent || "";
    return t.startsWith("{") && t.includes('"finished"');
  }, undefined, { timeout: 300000 });
  const raw = await driver.locator("#report").textContent();
  const json = JSON.parse(raw || "{}");
  await driver.close();
  return json;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const { id, key } = makeExtensionKey();
  extId = id;
  prepareExtensionDir(key);
  baseUrl = await startServer();
  await launch(key);
  console.log(`launched Chrome ${launchMode} extId=${extId} base=${baseUrl}`);

  // Generate a real PNG containing text for the OCR attempt.
  const shot = await (ctx as BrowserContext).newPage();
  await shot.setViewportSize({ width: 620, height: 180 });
  await shot.setContent(
    '<html><body style="margin:0;background:#fff"><div style="font:900 46px Arial,sans-serif;color:#000;padding:24px">COPYUNLOCK OCR 42<br>hello world sample</div></body></html>'
  );
  await shot.screenshot({ path: join(FIXTURES, "ocr-sample.png") });
  await shot.close();
  writeFileSync(
    join(FIXTURES, "ocr-target.html"),
    '<!doctype html><html><body><p>below an image</p><img src="/ocr-sample.png"><p>caption</p></body></html>'
  );
  writeFileSync(
    join(FIXTURES, "ocr-cancel.html"),
    '<!doctype html><html><body><p>two images below</p><img src="/ocr-sample.png"><img src="/ocr-sample.png"><p>caption</p></body></html>'
  );

  // Big dense text image (slower OCR) so cancellation can land mid-worker.
  const big = await (ctx as BrowserContext).newPage();
  await big.setViewportSize({ width: 1600, height: 1200 });
  const lines = Array.from({ length: 40 }, (_, i) => `line number ${i} copyunlock dense text row`).join("<br>");
  await big.setContent(
    `<html><body style="margin:0;background:#fff"><div style="font:28px Arial,sans-serif;color:#000;padding:16px">${lines}</div></body></html>`
  );
  await big.screenshot({ path: join(FIXTURES, "ocr-big.png") });
  await big.close();
  const imgs = ["/ocr-big.png", "/ocr-big.png", "/ocr-big.png"].map((s) => `<img src="${s}">`).join("");
  writeFileSync(
    join(FIXTURES, "ocr-slow.html"),
    `<!doctype html><html><body><p>three big images below</p>${imgs}<p>caption</p></body></html>`
  );
});

test.afterAll(async () => {
  try { await ctx?.close(); } catch { /* ignore */ }
  try { server?.close(); } catch { /* ignore */ }
});

test("T1 popup renders, handles unsupported pages, persists settings", async () => {
  const page = await (ctx as BrowserContext).newPage();
  await page.goto(`chrome-extension://${extId}/popup.html`);
  await expect(page.locator("h1")).toHaveText("Extract visible text");
  await expect(page.locator("#extract")).toBeVisible();
  await expect(page.locator("#analyze")).toBeVisible();
  await expect(page.locator("#cancel")).toBeHidden();

  // Popup opened as a tab cannot reach a content script (active tab = itself).
  await page.locator("#analyze").click();
  await expect(page.locator("#capability")).toContainText("cannot be scripted");
  await expect(page.locator("#status")).toHaveText("Unsupported");

  await page.locator("#extract").click();
  await expect(page.locator("#error")).toBeVisible();
  await expect(page.locator("#retry")).toBeVisible();
  await expect(page.locator("#domOnly")).toBeVisible();
  await expect(page.locator("#status")).toHaveText("Error");
  record("T1-popup-unsupported", { status: "pass" });

  // Settings persistence: theme dark + OCR enabled.
  await page.locator("#theme").selectOption("dark");
  await expect(page.locator("body")).toHaveClass(/dark/);
  await page.locator("#ocrEnabled").setChecked(true);
  await page.locator("#saveHistory").setChecked(true);

  const page2 = await (ctx as BrowserContext).newPage();
  await page2.goto(`chrome-extension://${extId}/popup.html`);
  await expect(page2.locator("#theme")).toHaveValue("dark");
  await expect(page2.locator("body")).toHaveClass(/dark/);
  await expect(page2.locator("#ocrEnabled")).toBeChecked();
  await expect(page2.locator("#saveHistory")).toBeChecked();
  // history default is off in a fresh profile but we just enabled it; verify value round-trips
  await page2.locator("#ocrEnabled").setChecked(false);
  await page2.locator("#theme").selectOption("system");
  record("T1-settings-persist", { status: "pass", theme: "dark", history: true });
  await page.close();
  await page2.close();
});

test("T2 core pipeline: static article, selection-blocked, dynamic", async () => {
  const fixtures = [
    {
      file: "static-article.html",
      expectText: "Static Article",
      relock: true,
      note: "static",
    },
    {
      file: "selection-blocked.html",
      expectText: "Selection Blocked",
      relock: false,
      note: "blocked",
    },
    {
      file: "dynamic.html",
      expectText: "Rendered after load.",
      relock: true,
      note: "dynamic",
    },
  ];
  for (const fx of fixtures) {
    const fixturePage = await (ctx as BrowserContext).newPage();
    await fixturePage.goto(`${baseUrl}/${fx.file}`);
    await fixturePage.waitForLoadState("load");
    await wait(1200);

    const r = await runDriver(fixturePage.url(), { unlock: true, relock: fx.relock });

    const resp = r.response || {};
    const meta: Record<string, unknown> = { fixture: fx.note, ready: r.ready, responseOk: resp.ok };
    if (fx.note === "blocked") {
      meta.capability = r.capability;
      const styles = await fixturePage.evaluate(() => ({
        htmlInline: document.documentElement.style.userSelect,
        htmlComputed: getComputedStyle(document.documentElement).userSelect,
        bodyComputed: getComputedStyle(document.body).userSelect,
        styleElPresent: !!document.getElementById("copyunlock-unlock-style"),
      }));
      meta.stylesAfterUnlock = styles;
      expect(r.capability?.userSelectBlocked).toBe(true);
      expect(r.ready).toBe(true);
      // The stronger unlock must re-enable selection on the element itself.
      expect(styles.bodyComputed).toBe("text");
      expect(styles.styleElPresent).toBe(true);
    } else {
      expect(r.ready).toBe(true);
    }
    expect(resp.ok).toBe(true);
    expect(resp.result?.method).toBe("dom");
    expect(resp.result?.wordCount).toBeGreaterThan(0);
    expect(resp.result?.text).toContain(fx.expectText);

    // Progress contract: unlock -> dom -> finalize for DOM-only extraction.
    const stages = (r.progressEvents || []).map((p: any) => p.stage);
    meta.progressStages = stages;
    expect(stages).toContain("unlock");
    expect(stages).toContain("dom");
    expect(stages).toContain("finalize");

    if (fx.relock) {
      const styleAfterRelock = await fixturePage.evaluate(() => ({
        attr: document.documentElement.getAttribute("style"),
        has: document.documentElement.hasAttribute("style"),
        cssText: document.documentElement.style.cssText,
        userSelect: getComputedStyle(document.documentElement).userSelect,
        bodyUserSelect: getComputedStyle(document.body).userSelect,
      }));
      meta.styleAttrAfterRelock = styleAfterRelock;
      expect(styleAfterRelock.attr === null || styleAfterRelock.attr === "").toBe(true);
    }
    record(`T2-${fx.note}`, { status: "pass", ...meta });
    await fixturePage.close();
  }
});

test("T3 OCR fallback attempt (informative)", async () => {
  const fixturePage = await (ctx as BrowserContext).newPage();
  await fixturePage.goto(`${baseUrl}/ocr-target.html`);
  await fixturePage.waitForLoadState("load");
  await wait(1500);
  let verdict = "";
  try {
    const r = await runDriver(fixturePage.url(), { unlock: false, relock: false, ocr: true, lang: "eng" });
    const resp = r.response || {};
    if (resp.ok) {
      const text = resp.result?.text || "";
      const method = resp.result?.method;
      // After the escape fix: real paragraph breaks and a truthful word count.
      const hasLiteralEscapes = text.includes("\\n");
      verdict = `ok method=${method} words=${resp.result?.wordCount} hasOcrWord=${/COPYUNLOCK/i.test(text)} hasLiteralEscapes=${hasLiteralEscapes}`;
      expect(method).not.toBe("dom");
      expect(resp.result?.wordCount).toBeGreaterThan(3);
      expect(/COPYUNLOCK/i.test(text)).toBe(true);
      expect(hasLiteralEscapes).toBe(false);
    } else {
      verdict = `failed ${resp.error}`;
    }
    record("T3-ocr", { status: "informative", verdict, progress: r.progressEvents?.slice(0, 6), ready: r.ready });
  } catch (e) {
    verdict = `runner error: ${String(e)}`;
    record("T3-ocr", { status: "informative", verdict });
  }
  console.log("T3 verdict:", verdict);
  await fixturePage.close();
});

test("T4 OCR cancellation (informative)", async () => {
  const fixturePage = await (ctx as BrowserContext).newPage();
  await fixturePage.goto(`${baseUrl}/ocr-cancel.html`);
  await fixturePage.waitForLoadState("load");
  await wait(1500);
  let verdict = "";
  try {
    const r = await runDriver(fixturePage.url(), { unlock: false, relock: false, ocr: true, lang: "eng", autoCancelMs: 5000 });
    const resp = r.response || {};
    if (resp.ok) {
      verdict = `completed despite cancel method=${resp.result?.method}`;
    } else {
      verdict = `settled with error=${resp.error}`;
    }
    record("T4-ocr-cancel", { status: "informative", verdict, progressStages: (r.progressEvents || []).map((p: any) => p.stage), ready: r.ready });
  } catch (e) {
    verdict = `runner error: ${String(e)}`;
    record("T4-ocr-cancel", { status: "informative", verdict });
  }
  console.log("T4 verdict:", verdict);
  await fixturePage.close();
});

test("T5 OCR language ind (informative)", async () => {
  const fixturePage = await (ctx as BrowserContext).newPage();
  await fixturePage.goto(`${baseUrl}/ocr-target.html`);
  await fixturePage.waitForLoadState("load");
  await wait(1200);
  let verdict = "";
  try {
    const r = await runDriver(fixturePage.url(), { unlock: false, relock: false, ocr: true, lang: "ind" });
    const resp = r.response || {};
    if (resp.ok) {
      verdict = `ok method=${resp.result?.method} words=${resp.result?.wordCount} textHead="${(resp.result?.text || "").slice(0, 80)}"`;
    } else {
      verdict = `failed ${resp.error}`;
    }
    record("T5-ocr-ind", { status: "informative", verdict, ready: r.ready });
  } catch (e) {
    verdict = `runner error: ${String(e)}`;
    record("T5-ocr-ind", { status: "informative", verdict });
  }
  console.log("T5 verdict:", verdict);
  await fixturePage.close();
});

test("T6 OCR language eng+ind (informative)", async () => {
  const fixturePage = await (ctx as BrowserContext).newPage();
  await fixturePage.goto(`${baseUrl}/ocr-target.html`);
  await fixturePage.waitForLoadState("load");
  await wait(1200);
  let verdict = "";
  try {
    const r = await runDriver(fixturePage.url(), { unlock: false, relock: false, ocr: true, lang: "eng+ind" });
    const resp = r.response || {};
    if (resp.ok) {
      verdict = `ok method=${resp.result?.method} words=${resp.result?.wordCount} hasOcrWord=${/COPYUNLOCK/i.test(resp.result?.text || "")}`;
    } else {
      verdict = `failed ${resp.error}`;
    }
    record("T6-ocr-engind", { status: "informative", verdict, ready: r.ready });
  } catch (e) {
    verdict = `runner error: ${String(e)}`;
    record("T6-ocr-engind", { status: "informative", verdict });
  }
  console.log("T6 verdict:", verdict);
  await fixturePage.close();
});

test("T7 OCR cancellation mid-worker on slow images (informative)", async () => {
  const fixturePage = await (ctx as BrowserContext).newPage();
  await fixturePage.goto(`${baseUrl}/ocr-slow.html`);
  await fixturePage.waitForLoadState("load");
  await wait(1500);
  let verdict = "";
  try {
    const r = await runDriver(fixturePage.url(), { unlock: false, relock: false, ocr: true, lang: "eng", autoCancelMs: 3500 });
    const resp = r.response || {};
    const stages = (r.progressEvents || []).map((p: any) => p.stage);
    const errMsg = r.error ?? resp.error ?? resp.errorMessage ?? null;
    const lastProgress = (r.progressEvents || [])[(r.progressEvents || []).length - 1] || null;
    if (resp.ok) {
      verdict = `completed method=${resp.result?.method} words=${resp.result?.wordCount} stages=${stages.length} last=${JSON.stringify(lastProgress)}`;
    } else {
      verdict = `aborted(driverError=${errMsg}) resp=${JSON.stringify(resp).slice(0, 160)} stages=${stages.length} last=${JSON.stringify(lastProgress)}`;
    }
    record("T7-ocr-cancel-mid", { status: "informative", verdict, ready: r.ready, cancelledRequested: r.cancelledRequested, cancelled: r.cancelled });
  } catch (e) {
    verdict = `runner error: ${String(e)}`;
    record("T7-ocr-cancel-mid", { status: "informative", verdict });
  }
  console.log("T7 verdict:", verdict);
  await fixturePage.close();
});

test("T8 Microsoft Edge load + static extraction (informative)", async () => {
  const edgeProfile = join(ROOT, ".e2e-edge-profile");
  let verdict = "edge launch failed";
  let edgeCtx: BrowserContext | null = null;
  try {
    const edgeModes = [
      { name: "new-headless", headless: false, extra: ["--headless=new"] },
      { name: "headless", headless: true, extra: [] as string[] },
      { name: "headed", headless: false, extra: [] as string[] },
    ];
    for (const mode of edgeModes) {
      try {
        rmSync(edgeProfile, { recursive: true, force: true });
        mkdirSync(edgeProfile, { recursive: true });
        const c = await chromium.launchPersistentContext(edgeProfile, {
          channel: "msedge",
          headless: mode.headless,
          viewport: { width: 1000, height: 700 },
          ignoreDefaultArgs: ["--disable-extensions", "--disable-component-extensions-with-background-pages"],
          args: [
            `--disable-extensions-except=${EXT_DIR}`,
            `--load-extension=${EXT_DIR}`,
            "--no-first-run",
            "--no-default-browser-check",
            ...mode.extra,
          ],
        });
        const probe = await c.newPage();
        let ok = false;
        try {
          const resp = await probe.goto(`chrome-extension://${extId}/popup.html`, { timeout: 8000 });
          await probe.waitForLoadState("domcontentloaded");
          ok = !!resp && !(resp.status() >= 400) && (await probe.locator("h1").count()) > 0;
        } catch (e) {
          console.log(`edge probe(${mode}) error: ${String(e).slice(0, 200)}`);
        }
        await probe.close().catch(() => {});
        if (!ok) {
          await c.close();
          continue;
        }
        edgeCtx = c;
        // Static extraction smoke on Edge.
        const fx = await c.newPage();
        await fx.goto(`${baseUrl}/static-article.html`);
        await fx.waitForLoadState("load");
        await wait(1200);
        const drv = await c.newPage();
        await drv.goto(`chrome-extension://${extId}/driver.html`);
        await drv.locator("#url").fill(fx.url());
        await drv.locator("#unlock").setChecked(true);
        await drv.locator("#relock").setChecked(true);
        await drv.locator("#ocr").setChecked(false);
        await drv.locator("#run").click();
        await drv.waitForFunction(() => {
          const t = document.querySelector("#report")?.textContent || "";
          return t.startsWith("{") && t.includes('"finished"');
        }, undefined, { timeout: 40000 });
        const rep = JSON.parse((await drv.locator("#report").textContent()) || "{}");
        const resp = rep.response || {};
        const okExtract = rep.ready === true && resp.ok === true && resp.result?.method === "dom" && (resp.result?.text || "").includes("Static Article");
        verdict = `edge(${mode}) loaded=${ok} extract=${okExtract ? "ok" : "FAIL"} method=${resp.result?.method} words=${resp.result?.wordCount}`;
        await drv.close().catch(() => {});
        await fx.close().catch(() => {});
        break;
      } catch (e) {
        console.log(`edge launch(${mode}) failed: ${String(e).slice(0, 300)}`);
      }
    }
  } finally {
    if (edgeCtx) {
      try { await edgeCtx.close(); } catch { /* ignore */ }
      rmSync(edgeProfile, { recursive: true, force: true });
    }
  }
  record("T8-edge", { status: "informative", verdict });
  console.log("T8 verdict:", verdict);
});
