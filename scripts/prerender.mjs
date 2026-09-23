// Prerender the Simplified Chinese text of script-rendered pages into their static HTML.
//
// about.html, contact/privacy/terms/risk-disclaimer.html and tutorial-*.html fill their
// title, intro and body from JavaScript (assets/about.js, assets/trust-pages.js, tutorials.js).
// Search and AI crawlers that do not run JavaScript would otherwise see an empty or stub page.
// This script runs each page script against a tiny fake DOM with language zh-CN and writes the
// resulting text into the elements with matching ids. The scripts still run in the browser and
// switch languages as before.
//
//   node scripts/prerender.mjs          -> update files
//   node scripts/prerender.mjs --check  -> exit 1 if any page is out of date

import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";
import process from "node:process";

const PAGES = [
  { file: "about.html", script: "assets/about.js" },
  { file: "contact.html", script: "assets/trust-pages.js" },
  { file: "privacy.html", script: "assets/trust-pages.js" },
  { file: "terms.html", script: "assets/trust-pages.js" },
  { file: "risk-disclaimer.html", script: "assets/trust-pages.js" },
  { file: "tutorial-open.html", script: "tutorials.js" },
  { file: "tutorial-rebate.html", script: "tutorials.js" },
  { file: "tutorial-existing.html", script: "tutorials.js" },
  { file: "tutorial-ib.html", script: "tutorials.js" }
];
const checkOnly = process.argv.includes("--check");
const escapeText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function render(html, code) {
  const page = (html.match(/<body[^>]*data-page="([^"]+)"/) || [])[1] || "";
  const els = new Map();
  const element = (id) => {
    if (!els.has(id)) {
      els.set(id, {
        id,
        value: "",
        dataset: {},
        style: {},
        addEventListener() {},
        setAttribute() {},
        querySelectorAll: () => [],
        querySelector: () => null,
        set textContent(v) { this._text = v; this._html = undefined; },
        get textContent() { return this._text; },
        set innerHTML(v) { this._html = v; this._text = undefined; },
        get innerHTML() { return this._html; }
      });
    }
    return els.get(id);
  };
  const documentElement = { lang: "zh-CN" };
  const context = {
    document: {
      body: { dataset: { page } },
      documentElement,
      getElementById: element,
      querySelector: () => null,
      querySelectorAll: () => []
    },
    localStorage: { getItem: () => null, setItem() {} },
    location: { search: "", href: "" },
    navigator: { language: "zh-CN" },
    URLSearchParams,
    console
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(code, context);

  let out = html;
  for (const el of els.values()) {
    const content = el._html !== undefined ? el._html : el._text !== undefined ? escapeText(el._text) : undefined;
    if (content === undefined || el.id === "lang") continue;
    const re = new RegExp(`(<([a-z0-9]+)\\b[^>]*\\bid="${el.id}"[^>]*>)([\\s\\S]*?)(</\\2>)`, "i");
    if (!re.test(out)) continue;
    out = out.replace(re, (_, open, _tag, _old, close) => `${open}${content}${close}`);
  }
  return out;
}

const stale = [];
for (const { file, script } of PAGES) {
  const html = await readFile(file, "utf8");
  const code = await readFile(script, "utf8");
  const next = render(html, code);
  if (next !== html) {
    stale.push(file);
    if (!checkOnly) await writeFile(file, next);
  }
}
if (checkOnly && stale.length) {
  console.error(`Prerender out of date: ${stale.join(", ")}\nRun: node scripts/prerender.mjs`);
  process.exit(1);
}
console.log(stale.length ? `Prerendered: ${stale.join(", ")}` : "Prerender: everything up to date.");
