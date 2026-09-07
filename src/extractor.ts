import type { ExtractionResult } from "./types";

const NOISE = /nav|menu|footer|header|sidebar|comment|cookie|advert|social|share|related|login|subscribe|modal/i;

function score(el: HTMLElement): number {
  const text = (el.innerText || "").trim();
  if (!text) return -100;
  const name = `${el.tagName} ${el.id} ${el.className}`;
  let s = Math.min(text.length / 40, 30);
  if (/^(ARTICLE|MAIN)$/.test(el.tagName)) s += 30;
  if (NOISE.test(name)) s -= 45;
  if ((el.querySelectorAll("p").length) >= 3) s += 25;
  return s;
}

function clean(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function markdown(root: HTMLElement): string {
  const lines: string[] = [];
  for (const el of Array.from(root.querySelectorAll("h1,h2,h3,h4,p,li,blockquote"))) {
    const text = clean(el.textContent || "");
    if (!text) continue;
    if (/^H[1-4]$/.test(el.tagName)) lines.push(`${"#".repeat(Number(el.tagName[1]))} ${text}`);
    else if (el.tagName === "LI") lines.push(`- ${text}`);
    else if (el.tagName === "BLOCKQUOTE") lines.push(`> ${text}`);
    else lines.push(text);
  }
  return clean(lines.join("\n\n"));
}

export function extractDom(): ExtractionResult {
  const candidates = [document.querySelector("article"), document.querySelector("main"), document.body]
    .filter((x): x is HTMLElement => x instanceof HTMLElement);
  const root = [...candidates].sort((a,b) => score(b)-score(a))[0] ?? document.body;
  const text = clean(root.innerText || "");
  const md = markdown(root);
  const wordCount = text ? text.split(/\s+/).length : 0;
  const confidence = Math.max(0, Math.min(1, wordCount >= 120 ? .95 : wordCount >= 40 ? .8 : .55));
  return { method: "dom", text, markdown: md || text, wordCount, confidence };
}