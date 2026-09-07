import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/content.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  outfile: "dist/content.js",
  target: "es2022"
});

await build({
  entryPoints: ["src/popup.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  outfile: "dist/popup.js",
  target: "es2022"
});

await cp("manifest.json", "dist/manifest.json");
await cp("popup.html", "dist/popup.html");
await cp("popup.css", "dist/popup.css");
await cp("README.md", "dist/README.md");
