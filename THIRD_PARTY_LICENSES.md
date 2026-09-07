# Third-Party Licenses & Notices

CopyUnlock is licensed under the MIT License (see `LICENSE`). This document lists
the licenses of third-party components that are distributed with, or fetched by,
this project, in accordance with their license terms.

> Ringkasan (ID): Lisensi MIT hanya berlaku untuk kode CopyUnlock sendiri.
> Pustaka yang ikut didistribusikan/diunduh memiliki lisensinya masing-masing dan
> tidak digantikan oleh MIT.

## Bundled into the built extension (`dist/content.js`)

### tesseract.js — Apache License 2.0
- Project: https://github.com/naptha/tesseract.js
- Version used: 6.x (declared in `package.json`)
- Copyright: Jerome Wu and contributors
- License: [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)

The tesseract.js source code is bundled into the compiled content script produced
by `npm run build`. Its license and copyright notices must remain intact when this
distribution is copied. The full Apache-2.0 license text is available at
https://www.apache.org/licenses/LICENSE-2.0 (a copy is also included in the
`node_modules/tesseract.js` package of a source install).

## Fetched at runtime (not bundled)

### OCR language data (tessdata)
- When OCR is enabled for the first time, language data
  (`eng`, `ind`, `eng+ind`) is downloaded from the public tessdata distribution and
  cached locally by the browser.
- These traineddata files are published under a mix of licenses depending on the
  language and source (commonly Apache-2.0 and/or CC BY-SA / similar). See the
  upstream sources for exact terms:
  - tessdata (fast): https://github.com/tesseract-ocr/tessdata_fast
  - tesseract.js default language path: https://tessdata.projectnaptha.com
- No language data is redistributed inside this repository.

## Development-time dependencies (NOT distributed with the extension)

These are used only to build and test the project and are not included in the
published extension package:

| Package | License |
|---|---|
| esbuild | MIT |
| typescript | Apache-2.0 |
| vitest | MIT |
| @playwright/test | Apache-2.0 |
| playwright | Apache-2.0 |
| tesseract.js (source install) | Apache-2.0 |

See each package's `package.json` / repository for full license texts.
