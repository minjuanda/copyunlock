import { detectCapabilities, unlock, relock } from "./unlock";
import { extractDom } from "./extractor";
import { OcrSession, mergeOcr } from "./ocr";
import type { Request, ProgressEvent } from "./types";

const sessions = new Map<string, OcrSession>();

function progress(requestId: string, stage: ProgressEvent["stage"], value: number, message: string) {
  chrome.runtime.sendMessage({ type: "PROGRESS", requestId, stage, progress: value, message } satisfies ProgressEvent).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg: Request, _sender, sendResponse) => {
  if (msg.type === "ANALYZE") {
    sendResponse({ ok: true, capability: detectCapabilities() });
    return;
  }
  if (msg.type === "UNLOCK") {
    unlock();
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === "RELOCK") {
    relock();
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === "OCR_CANCEL") {
    sessions.get(msg.requestId)?.cancel();
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === "EXTRACT") {
    void (async () => {
      try {
        if (msg.ocrEnabled) unlock();
        progress(msg.requestId, "unlock", .2, "Preparing page");
        const dom = extractDom();
        progress(msg.requestId, "dom", .45, `DOM extraction: ${dom.wordCount} words`);
        if (!msg.ocrEnabled || dom.wordCount >= 40) {
          progress(msg.requestId, "finalize", 1, "Extraction complete");
          sendResponse({ ok: true, result: dom });
          return;
        }
        const session = new OcrSession();
        sessions.set(msg.requestId, session);
        const images = Array.from(document.images).filter(i => i.naturalWidth >= 120 && i.naturalHeight >= 60);
        progress(msg.requestId, "ocr", .5, `OCR fallback: ${images.length} image(s)`);
        const ocr = await session.run(images, msg.ocrLanguage, p => progress(msg.requestId, "ocr", .5 + p*.45, `OCR ${Math.round(p*100)}%`));
        sessions.delete(msg.requestId);
        const result = mergeOcr(dom, ocr);
        progress(msg.requestId, "finalize", 1, "Extraction complete");
        sendResponse({ ok: true, result });
      } catch (error) {
        sessions.delete(msg.requestId);
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    })();
    return true;
  }
});