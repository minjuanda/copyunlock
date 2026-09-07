# Validation Report — CopyUnlock v0.9.1

## Scope

Validation covers the fixes applied after the v0.9.0 release candidate plus the full browser-runtime gate: build pipeline, popup UI, DOM extraction, unlock/relock behavior, OCR fallback and languages, OCR cancellation, recovery states, settings persistence, privacy contract, and real-browser loading in Chromium and Microsoft Edge.

## Result

**STATUS: RELEASE-CANDIDATE RUNTIME GATE PASSED (automated).**
Manual Chrome-stable spot checks across real sites remain recommended before labeling the extension production-ready.

## Build validation

- `npm install`: PASS.
- `npm run check`: PASS — Vitest 3/3 tests (safe settings defaults, privacy contract, integrated flow ordering); esbuild emits `dist/` containing `manifest.json`, `popup.html`, `popup.js`, `popup.css`, `content.js`, `README.md`.

## Browser-runtime validation (Playwright, unpacked extension)

| Test | Scope | Result |
|---|---|---|
| T1 | Popup UI, unsupported-page recovery, settings persistence | PASS |
| T2 | DOM extraction: static article (24 words); selection-blocked page (analyze reports `userSelectBlocked`; unlock makes the element selectable — body computed `user-select` changes `none → text`); dynamic page (content rendered after `document_idle` is extracted). Progress stages `unlock → dom → finalize` | PASS |
| T3/T5/T6 | OCR fallback `eng` / `ind` / `eng+ind` | PASS — method `dom+ocr`, word count 10, image text recognized, no literal escape artifacts |
| T4/T7 | OCR cancellation | PASS (best-effort at worker-operation boundaries) — cancel returns promptly with `OCR cancelled`; popup shows **Cancelled** |
| T8 | Microsoft Edge | PASS — extension loads; static article extraction (`dom`, 24 words) |

## Privacy & safety assessment

- No cloud upload endpoint exists; page text and OCR images are processed locally; history is disabled by default.
- OCR models are fetched from CDN on first use in this release (network required once), then cached.
- No authentication, DRM, encryption, paywall, or server-side authorization bypass implemented. **PASS.**

## Remaining recommendations

- Real-site manual validation on Chrome stable (this channel blocks automated `--load-extension`).
- Restore deeper unit coverage for the pipeline / OCR / unlock modules (coverage dropped versus v0.8).
- Decide whether to bundle OCR models fully offline so the "local OCR models" claim is accurate with zero network use.

## Decision

**PASS** as the v0.9.1 release candidate. Keep the beta label until real-site Chrome/Edge spot checks pass and OCR latency/memory/error behavior are measured on representative images.
