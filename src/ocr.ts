import { createWorker, type Worker } from "tesseract.js";
import type { ExtractionResult, OcrLanguage } from "./types";

export class OcrSession {
  private worker: Worker | null = null;
  private cancelled = false;
  private abortReject: ((reason: DOMException) => void) | null = null;

  async run(images: HTMLImageElement[], language: OcrLanguage, onProgress: (p:number)=>void): Promise<string> {
    this.cancelled = false;
    this.abortReject = null;
    this.worker = await createWorker(language, 1, { logger: m => onProgress(Math.max(0, Math.min(1, m.progress ?? 0))) });
    const chunks: string[] = [];
    // Rejects promptly when cancel() is called, even mid-recognize. Terminating
    // the worker alone leaves the in-flight job promise pending forever, which
    // would hang the EXTRACT response.
    const abort = new Promise<never>((_resolve, reject) => { this.abortReject = reject; });
    try {
      for (const [i, img] of images.entries()) {
        if (this.cancelled) throw new DOMException("OCR cancelled", "AbortError");
        if (!img.complete || img.naturalWidth === 0) continue;
        const result = await Promise.race([this.worker.recognize(img), abort]);
        const text = result.data.text.trim();
        if (text) chunks.push(text);
        onProgress((i + 1) / images.length);
      }
      return chunks.join("\n\n");
    } finally {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.abortReject?.(new DOMException("OCR cancelled", "AbortError"));
  }
}

export function mergeOcr(dom: ExtractionResult, ocrText: string): ExtractionResult {
  const cleaned = ocrText.replace(/\s+$/g, "").trim();
  if (!cleaned) return dom;
  const text = dom.text ? `${dom.text}\n\n${cleaned}` : cleaned;
  return { ...dom, method: dom.text ? "dom+ocr" : "ocr", text, markdown: dom.markdown ? `${dom.markdown}\n\n${cleaned}` : cleaned,
    wordCount: text.split(/\s+/).length, confidence: Math.max(dom.confidence, .6) };
}