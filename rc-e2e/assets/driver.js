// CopyUnlock E2E driver — extension page that exercises the exact message
// contract the real popup uses against the active content-script tab:
//   ANALYZE -> (UNLOCK) -> EXTRACT -> (RELOCK)  with PROGRESS capture.
// The fixture tab is discovered by pinging every tab with ANALYZE (content
// scripts answer), which avoids depending on chrome.tabs url visibility.
(() => {
  const $ = (id) => document.getElementById(id);
  const report = $("report");

  function setReport(o) {
    report.textContent = JSON.stringify(o, null, 2);
  }
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function makeRequestId() {
    return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  }

  async function pingAnalyze(tabId) {
    try {
      const r = await chrome.tabs.sendMessage(tabId, { type: "ANALYZE" });
      return r && r.ok ? r : null;
    } catch (_) {
      return null;
    }
  }

  // Find a tab whose content script answers ANALYZE (i.e. a loaded fixture).
  async function findContentTab() {
    for (let round = 0; round < 60; round++) {
      let tabs = [];
      try {
        tabs = await chrome.tabs.query({});
      } catch (_) {
        return { error: "tabs.query failed" };
      }
      for (const t of tabs) {
        if (!t.id || t.id < 0) continue;
        const r = await pingAnalyze(t.id);
        if (r) return { tab: t, capability: r.capability };
      }
      await sleep(250);
    }
    return { error: "no tab with a reachable content script after retries" };
  }

  async function run() {
    const ocrEnabled = $("ocr").checked;
    const doUnlock = $("unlock").checked;
    const doRelock = $("relock").checked;
    const lang = $("lang").value;
    const autoCancelMs = parseInt($("autoCancel").value || "0", 10);

    const found = await findContentTab();
    if (found.error) { setReport({ finished: true, ok: false, error: found.error }); return; }
    const tab = found.tab;

    const progressEvents = [];
    const requestId = makeRequestId();
    const onMsg = (m) => {
      if (m && m.type === "PROGRESS" && m.requestId === requestId) {
        progressEvents.push({ stage: m.stage, progress: m.progress, message: m.message });
      }
    };
    chrome.runtime.onMessage.addListener(onMsg);

    let cancelled = false;
    try {
      if (doUnlock) await chrome.tabs.sendMessage(tab.id, { type: "UNLOCK" });
      if (autoCancelMs > 0) {
        setTimeout(() => {
          cancelled = true;
          chrome.tabs.sendMessage(tab.id, { type: "OCR_CANCEL", requestId }).catch(() => {});
        }, autoCancelMs);
      }
      const sendPromise = chrome.tabs.sendMessage(tab.id, {
        type: "EXTRACT",
        requestId,
        ocrEnabled,
        ocrLanguage: lang,
      });
      const timeoutMs = ocrEnabled ? 260000 : 30000;
      let timer;
      const race = new Promise((_res, rej) => { timer = setTimeout(() => rej(new Error("timeout")), timeoutMs); });
      const r = await Promise.race([sendPromise, race]);
      clearTimeout(timer);
      if (doRelock) await chrome.tabs.sendMessage(tab.id, { type: "RELOCK" }).catch(() => {});
      setReport({
        finished: true,
        ok: true,
        ready: true,
        capability: found.capability || null,
        cancelledRequested: autoCancelMs > 0,
        cancelled,
        response: r || null,
        progressEvents,
      });
    } catch (e) {
      if (doRelock) chrome.tabs.sendMessage(tab.id, { type: "RELOCK" }).catch(() => {});
      setReport({
        finished: true,
        ok: false,
        ready: true,
        capability: found.capability || null,
        cancelledRequested: autoCancelMs > 0,
        cancelled,
        error: String(e),
        progressEvents,
      });
    } finally {
      chrome.runtime.onMessage.removeListener(onMsg);
    }
  }

  $("run").addEventListener("click", () => { report.textContent = "running..."; run().catch((e) => setReport({ finished: true, error: String(e) })); });
})();
