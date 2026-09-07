export type OcrLanguage = "eng" | "ind" | "eng+ind";
export type Theme = "system" | "light" | "dark";

export interface Settings {
  autoUnlock: boolean;
  ocrEnabled: boolean;
  ocrLanguage: OcrLanguage;
  saveHistory: boolean;
  theme: Theme;
}

export interface Capability {
  userSelectBlocked: boolean;
  contextMenuBlocked: boolean;
  copyBlocked: boolean;
  selectionBlocked: boolean;
}

export interface ExtractionResult {
  method: "dom" | "ocr" | "dom+ocr";
  text: string;
  markdown: string;
  wordCount: number;
  confidence: number;
}

export type Request =
  | { type: "ANALYZE" }
  | { type: "UNLOCK" }
  | { type: "RELOCK" }
  | { type: "EXTRACT"; requestId: string; ocrEnabled: boolean; ocrLanguage: OcrLanguage }
  | { type: "OCR_CANCEL"; requestId: string };

export type ProgressEvent = {
  type: "PROGRESS";
  requestId: string;
  stage: "unlock" | "dom" | "ocr" | "finalize";
  progress: number;
  message: string;
};