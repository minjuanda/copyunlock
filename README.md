# CopyUnlock

<p align="center">
  <img src="icons/icon128.png" alt="CopyUnlock logo" width="128" height="128">
</p>

[![CI](https://github.com/minjuanda/copyunlock/actions/workflows/ci.yml/badge.svg)](https://github.com/minjuanda/copyunlock/actions/workflows/ci.yml)

**Local-first browser extension** (Chrome / Edge, Manifest V3) untuk mengekstrak teks halaman web
yang sedang tampil, membuka kunci pembatasan salin sisi-klien secara **reversibel**, dan (opsional)
memakai **OCR lokal** sebagai cadangan bila teks DOM terlalu sedikit.

Alur: `Analyze → Unlock → Extract → OCR fallback (optional) → Progress → Result → Copy/Export → Recovery → Settings → Privacy`

> **Safety boundary** — CopyUnlock hanya bekerja pada konten yang *sudah tampil* di browser Anda.
> Ekstensi ini **bukan** alat untuk melewati autentikasi, DRM, enkripsi, paywall, atau otorisasi server.

## Fitur

- Ekstraksi DOM sebagai metode utama; pembuat Markdown bawaan.
- Deteksi pembatasan halaman (`user-select`, `contextmenu`, `copy`, `selectstart`).
- Unlock sisi-klien yang dapat dibalik (CSS dipulihkan saat relock/reload).
- OCR fallback opsional dengan pilihan bahasa `eng`, `ind`, `eng+ind` (Tesseract.js).
- Progress + pembatalan OCR (best-effort pada batas operasi worker).
- Hasil dengan tab **Text / Markdown**, tombol **Copy**, ekspor **TXT / Markdown**.
- Recovery: **Retry** dan **DOM only**.
- Pengaturan lokal (`chrome.storage`): auto-unlock, OCR, bahasa, riwayat (default **mati**), tema.
- Privasi: teks halaman & OCR diproses di perangkat; tidak ada unggahan cloud.

## Cara pasang (Load unpacked)

### Tanpa Node.js (untuk pengguna) — paling gampang
1. Unduh **`CopyUnlock_v0_9_1_Extension.zip`** dari halaman [Releases](https://github.com/minjuanda/copyunlock/releases).
2. Ekstrak ZIP (muncul folder `CopyUnlock_v0_9_1_Extension`).
3. Buka `chrome://extensions` (Edge: `edge://extensions`).
4. Aktifkan **Developer mode** → **Load unpacked** → pilih folder `CopyUnlock_v0_9_1_Extension`.
5. Sematkan (pin) ikon CopyUnlock, lalu muat ulang halaman web yang terbuka.

### Dari source (untuk pengembang)
```bash
npm install
npm run check        # hasil build di dist/
```
Lalu Load unpacked folder `dist/` (langkah 3–5 di atas).

## Pengembangan

```bash
npm install          # pasang dependensi
npm run check        # unit test (Vitest) + build (esbuild)
npm run test         # unit test saja
npm run build        # build dist/
npm run test:e2e     # smoke Playwright
# Suite browser nyata (memuat ekstensi unpacked di Chromium/Edge):
npx playwright install chromium
npx playwright test --config=playwright.rc.config.ts
```

### Struktur proyek

```
manifest.json   Manifes MV3 (action popup + content script <all_urls>)
popup.html/css  Antarmuka popup
build.mjs       Build esbuild -> dist/
src/
  content.ts    Content script: ANALYZE/UNLOCK/RELOCK/EXTRACT/OCR_CANCEL
  extractor.ts  Ekstraksi DOM + Markdown + skor kualitas
  unlock.ts     Deteksi & unlock/relock CSS sisi-klien (reversibel)
  ocr.ts        Sesi OCR Tesseract + pembatalan + penggabungan hasil
  settings.ts   Pengaturan & tema (chrome.storage.local)
  privacy.ts    Kontrak privasi
  popup.ts      Logika UI popup
tests/          Unit test Vitest + spec Playwright
fixtures/       Halaman contoh (statis, anti-seleksi, dinamis, OCR)
rc-e2e/         Harness uji browser nyata (Playwright)
docs/           Dokumentasi (panduan, changelog, validasi, privasi)
```

## Dokumentasi

- [Panduan Penggunaan (id)](docs/PANDUAN_PENGGUNAAN.md)
- [Changelog](docs/CHANGELOG.md)
- [Validation Report v0.9.1](docs/VALIDATION_REPORT.md)
- [Privasi & Keamanan](docs/PRIVACY_SECURITY.md)

## Lisensi

[MIT](LICENSE)
