// Build one static homepage per language so search engines and AI crawlers can index every
// language, not only Simplified Chinese.
//
// index.html (zh-CN) stays the source. Its text comes from assets/home-i18n.js through
// data-i18n attributes, which home.js swaps in the browser. This script applies the same
// translations at build time and writes en.html, zh-hant.html, ms.html and th.html with their
// own <title>, description, canonical URL, structured data and hreflang links. It also keeps
// the head of index.html (title, description, hreflang) in step with the translation file.
//
//   node scripts/build-locales.mjs          -> update files
//   node scripts/build-locales.mjs --check  -> exit 1 if any page is out of date

import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";
import process from "node:process";

const SITE = "https://max-rebate.com";
// key = translation key in home-i18n.js; hreflang/htmlLang = what crawlers see.
const LOCALES = [
  { key: "zh-CN", file: "index.html", hreflang: "zh-CN", htmlLang: "zh-CN" },
  { key: "zh-TW", file: "zh-hant.html", hreflang: "zh-Hant", htmlLang: "zh-Hant" },
  { key: "en", file: "en.html", hreflang: "en", htmlLang: "en" },
  { key: "ms", file: "ms.html", hreflang: "ms", htmlLang: "ms" },
  { key: "th", file: "th.html", hreflang: "th", htmlLang: "th" }
];
const checkOnly = process.argv.includes("--check");

const escapeText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s) => escapeText(s).replace(/"/g, "&quot;");
const urlOf = (file) => (file === "index.html" ? `${SITE}/` : `${SITE}/${file}`);

const context = { window: {} };
vm.createContext(context);
vm.runInContext(await readFile("assets/home-i18n.js", "utf8"), context);
const T = context.window.MAX_REBATE_TRANSLATIONS;

function setTag(html, re, replacement, label) {
  if (!re.test(html)) throw new Error(`index.html: cannot find ${label}`);
  return html.replace(re, replacement);
}

function setHead(html, locale) {
  const t = T[locale.key];
  const url = urlOf(locale.file);
  html = setTag(html, /<html\b[^>]*>/i, `<html lang="${locale.htmlLang}" data-page-lang="${locale.key}">`, "<html>");
  html = setTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeText(t.metaTitle)}</title>`, "<title>");
  html = setTag(html, /<meta name="description" content="[^"]*">/i, `<meta name="description" content="${escapeAttr(t.metaDesc)}">`, "meta description");
  html = setTag(html, /<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${escapeAttr(t.metaTitle)}">`, "og:title");
  html = setTag(html, /<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${escapeAttr(t.metaDesc)}">`, "og:description");
  html = setTag(html, /<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${url}">`, "og:url");
  html = setTag(html, /<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${url}">`, "canonical");

  // hreflang: every language version lists all versions, with the Chinese homepage as default.
  html = html.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?/gi, "");
  const alternates = [
    ...LOCALES.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${urlOf(l.file)}">`),
    `<link rel="alternate" hreflang="x-default" href="${SITE}/">`
  ].join("\n");
  html = html.replace(/(<link rel="canonical" href="[^"]*">)/i, `$1\n${alternates}`);
  return html;
}

function setStructuredData(html, locale) {
  const t = T[locale.key];
  const url = urlOf(locale.file);
  return setTag(
    html,
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
    (_, json) => {
      const data = JSON.parse(json);
      const graph = (data["@graph"] || []).filter((node) => node["@type"] !== "WebPage");
      graph.unshift({
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: t.metaTitle,
        description: t.metaDesc,
        inLanguage: locale.htmlLang,
        isPartOf: { "@id": `${SITE}/#website` },
        about: { "@id": `${SITE}/#organization` }
      });
      return `<script type="application/ld+json">${JSON.stringify({ ...data, "@graph": graph })}</script>`;
    },
    "JSON-LD"
  );
}

function setBody(html, locale) {
  const t = T[locale.key];
  html = html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/gi, (whole, open, _tag, key, _old, close) => {
    if (typeof t[key] !== "string") return whole;
    const text = key === "heroTitle" ? t[key].split("\n").map(escapeText).join("<br>") : escapeText(t[key]);
    return `${open}${text}${close}`;
  });
  // Pre-select this language in the switcher.
  html = html.replace(/<option value="([^"]+)"( selected)?>/g, (_, value) =>
    `<option value="${value}"${value === locale.key ? " selected" : ""}>`
  );
  return html;
}

const stale = [];
const root = LOCALES[0];
const original = await readFile(root.file, "utf8");
const source = setStructuredData(setHead(original, root), root);
const outputs = new Map([[root.file, source]]);
for (const locale of LOCALES.slice(1)) {
  outputs.set(locale.file, setBody(setStructuredData(setHead(source, locale), locale), locale));
}

for (const [file, next] of outputs) {
  let current = "";
  try {
    current = await readFile(file, "utf8");
  } catch {
    /* new page */
  }
  if (next !== current) {
    stale.push(file);
    if (!checkOnly) await writeFile(file, next);
  }
}

if (checkOnly && stale.length) {
  console.error(`Language pages out of date: ${stale.join(", ")}\nRun: node scripts/build-locales.mjs`);
  process.exit(1);
}
console.log(stale.length ? `Language pages updated: ${stale.join(", ")}` : "Language pages: everything up to date.");
