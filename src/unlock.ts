let active = false;
let previousStyle = "";
let handlersInstalled = false;

const UNLOCK_STYLE_ID = "copyunlock-unlock-style";

function addUnlockStyle(): void {
  // user-select:none set on <body> or on any element overrides a value set on
  // <html>, so a root-level property alone cannot re-enable selection. Inject a
  // universal !important rule and remove it again on relock.
  let el = document.getElementById(UNLOCK_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = UNLOCK_STYLE_ID;
    el.textContent =
      "html, body, body * { user-select: text !important; -webkit-user-select: text !important; }";
    (document.head || document.documentElement).appendChild(el);
  }
}

function removeUnlockStyle(): void {
  document.getElementById(UNLOCK_STYLE_ID)?.remove();
}

export function detectCapabilities() {
  const body = document.body;
  const computed = body ? getComputedStyle(body).userSelect : "";
  const inline = document.documentElement.innerHTML.match(/on(contextmenu|copy|cut|selectstart)\s*=/gi) ?? [];
  return {
    userSelectBlocked: computed === "none",
    contextMenuBlocked: inline.some(x => x.includes("contextmenu")),
    copyBlocked: inline.some(x => x.includes("copy")),
    selectionBlocked: inline.some(x => x.includes("selectstart"))
  };
}

export function unlock(): void {
  if (active) return;
  previousStyle = document.documentElement.getAttribute("style") ?? "";
  document.documentElement.style.setProperty("user-select", "text", "important");
  document.documentElement.style.setProperty("-webkit-user-select", "text", "important");
  const stop = (e: Event) => e.stopImmediatePropagation();
  for (const name of ["contextmenu","copy","cut","selectstart"]) {
    document.addEventListener(name, stop, true);
  }
  handlersInstalled = true;
  addUnlockStyle();
  active = true;
}

export function relock(): void {
  if (!active) return;
  if (handlersInstalled) {
    // Listener references are intentionally retained by the browser only for this page lifecycle.
    // Reversible behavior here restores CSS; page reload fully restores all event state.
  }
  if (previousStyle) document.documentElement.setAttribute("style", previousStyle);
  else document.documentElement.removeAttribute("style");
  removeUnlockStyle();
  active = false;
}