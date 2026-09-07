# Changelog

## v0.9.1 — Beta UI Integration & End-to-End Release Candidate (fixed)

### Build & quality gate
- Added `vitest.config.ts` so Vitest stops collecting Playwright specs (`tests/e2e`, `rc-e2e`). `npm run check` now passes end to end (unit tests + esbuild build).

### Bug fixes
- `src/ocr.ts` — removed double-escaped separators and regex. OCR results no longer contain literal `\n\n` text, and `wordCount` is now correct on the OCR path (previously stuck at 1).
- `popup.css` — corrected the `.output` class selector to `#output` so the result textarea is actually styled.
- `src/unlock.ts` — unlock now injects a reversible universal rule (`html, body, body * { user-select: text !important }`). Previously a restriction applied on `body`/elements (e.g. `body { user-select: none }`) stayed active because a value set on `<html>` cannot override an element's own rule. Relock removes the stylesheet and restores the original style attribute.
- `src/ocr.ts` + `src/popup.ts` — OCR cancellation is now responsive. Cancel aborts the in-flight recognize job with `AbortError` and returns a clean `{ ok: false, error: "OCR cancelled" }` response instead of hanging the EXTRACT channel; the popup shows status **Cancelled**.
- Version bump 0.9.0 → 0.9.1 in `package.json`, `manifest.json`, `README.md`.

### Validation
- `npm run check`: PASS — 3 Vitest tests + esbuild build.
- Real-browser suite (Playwright, unpacked extension in Chromium): 8/8 PASS.
- Popup render, unsupported-page recovery, settings persistence: PASS.
- Static article / selection-blocked / dynamic DOM extraction + progress contract: PASS.
- OCR fallback `eng`, `ind`, `eng+ind` (method `dom+ocr`, correct word count, no literal escapes): PASS.
- OCR cancellation mid-worker: clean abort with `OCR cancelled`: PASS.
- Microsoft Edge (headless): extension loads, static extraction PASS.

### Known limitations
- Relock restores CSS; page event interception is released on page reload.
- In this release the OCR worker/model are fetched from CDN on first use, then cached (network required once).
- Manual validation on Chrome stable across real sites is still recommended before a public 1.0 release.
- No authentication, DRM, encryption, paywall, or server-side authorization bypass is implemented.

---

*Riwayat changelog & validation report versi sebelumnya (v0.2–v0.9) tersedia dalam arsip proyek sebagai berkas .docx.*
