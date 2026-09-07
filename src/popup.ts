import { getSettings, saveSettings, applyTheme } from "./settings";
import type { Capability, ExtractionResult, OcrLanguage, ProgressEvent } from "./types";

let tabId = -1;
let currentResult: ExtractionResult | null = null;
let currentTab: "text" | "markdown" = "text";
let lastRequestId = "";
let domOnlyMode = false;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $("status");
const progressBar = $("progressBar");
const progressText = $("progressText");
const errorBox = $("error");
const resultBox = $("result");

function setStatus(text: string) { status.textContent = text; }
function setProgress(v: number, text: string) {
  progressBar.style.width = `${Math.round(v*100)}%`; progressText.textContent = text;
}
function send<T>(message: unknown): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message) as Promise<T>;
}
function showResult(result: ExtractionResult) {
  currentResult = result; resultBox.hidden = false; errorBox.hidden = true;
  $("method").textContent = result.method.toUpperCase();
  $("confidence").textContent = `${Math.round(result.confidence*100)}% confidence`;
  $("wordCount").textContent = `${result.wordCount} words`;
  $("output").value = currentTab === "text" ? result.text : result.markdown;
}
async function extract() {
  const s = await getSettings();
  lastRequestId = crypto.randomUUID();
  $("cancel").hidden = false; $("extract").disabled = true; setStatus("Working");
  try {
    if (s.autoUnlock) await send({ type: "UNLOCK" });
    const r = await send<any>({ type: "EXTRACT", requestId: lastRequestId, ocrEnabled: s.ocrEnabled && !domOnlyMode, ocrLanguage: s.ocrLanguage });
    if (!r?.ok) throw new Error(r?.error ?? "Extraction failed");
    showResult(r.result); setStatus("Complete"); setProgress(1, "Done");
    if (s.saveHistory) await chrome.storage.local.set({ lastResult: r.result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancelled|abort/i.test(msg)) {
      setStatus("Cancelled"); setProgress(0, "Cancelled"); return;
    }
    errorBox.hidden = false; $("errorMessage").textContent = msg;
    setStatus("Error");
  } finally {
    $("cancel").hidden = true; $("extract").disabled = false;
  }
}
async function init() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tabs[0]?.id ?? -1;
  const s = await getSettings();
  $("autoUnlock").checked = s.autoUnlock; $("ocrEnabled").checked = s.ocrEnabled;
  ($("ocrLanguage") as HTMLSelectElement).value = s.ocrLanguage;
  $("saveHistory").checked = s.saveHistory; ($("theme") as HTMLSelectElement).value = s.theme;
  applyTheme(s.theme);
  chrome.runtime.onMessage.addListener((m: ProgressEvent) => {
    if (m.type === "PROGRESS" && m.requestId === lastRequestId) setProgress(m.progress, m.message);
  });
  $("analyze").onclick = async () => {
    try { const r = await send<any>({ type: "ANALYZE" }); $("capability").textContent = JSON.stringify(r.capability); setStatus("Analyzed"); }
    catch { $("capability").textContent = "This page cannot be scripted."; setStatus("Unsupported"); }
  };
  $("extract").onclick = () => { domOnlyMode = false; void extract(); };
  $("cancel").onclick = () => { void send({ type: "OCR_CANCEL", requestId: lastRequestId }).catch(()=>{}); setStatus("Cancelling"); };
  $("retry").onclick = () => void extract();
  $("domOnly").onclick = () => { domOnlyMode = true; void extract(); };
  for (const id of ["autoUnlock","ocrEnabled","saveHistory"]) {
    $(id).onchange = async () => {
      const now = await getSettings();
      const next = { ...now, autoUnlock: $("autoUnlock").checked, ocrEnabled: $("ocrEnabled").checked, saveHistory: $("saveHistory").checked };
      await saveSettings(next); applyTheme(next.theme);
    };
  }
  $("ocrLanguage").onchange = async () => {
    const now = await getSettings(); const next = { ...now, ocrLanguage: ($("ocrLanguage") as HTMLSelectElement).value as OcrLanguage }; await saveSettings(next);
  };
  $("theme").onchange = async () => {
    const now = await getSettings(); const next = { ...now, theme: ($("theme") as HTMLSelectElement).value as any }; await saveSettings(next); applyTheme(next.theme);
  };
  for (const el of document.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
    el.onclick = () => { currentTab = el.dataset.tab as "text"|"markdown"; document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); el.classList.add("active"); if(currentResult) $("output").value = currentTab==="text"?currentResult.text:currentResult.markdown; };
  }
  $("copy").onclick = async () => { if(currentResult) await navigator.clipboard.writeText(currentTab==="text"?currentResult.text:currentResult.markdown); };
  $("exportTxt").onclick = () => download("copyunlock.txt", currentResult?.text ?? "");
  $("exportMd").onclick = () => download("copyunlock.md", currentResult?.markdown ?? "");
}
function download(name: string, content: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], {type:"text/plain"})); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
void init();