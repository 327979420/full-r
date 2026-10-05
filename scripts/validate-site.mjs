import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";

const root = process.cwd();
const failures = [];

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

async function exists(relativePath) {
  try {
    return (await stat(path.join(root, relativePath))).isFile();
  } catch {
    return false;
  }
}

function localTarget(href) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//")) return null;
  return href.split(/[?#]/, 1)[0].replace(/^\//, "") || "index.html";
}

const htmlFiles = (await readdir(root)).filter((name) => name.endsWith(".html")).sort();
const contentPages = htmlFiles.filter((name) => !name.startsWith("google"));

for (const file of contentPages) {
  const source = await readFile(path.join(root, file), "utf8");
  const ids = [...source.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) fail(file, `duplicate ids: ${duplicateIds.join(", ")}`);

  const h1Count = (source.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) fail(file, `expected exactly one h1, found ${h1Count}`);

  if (!/<meta\s+name=["']description["']/i.test(source)) fail(file, "missing meta description");
  if (!/<link\s+rel=["']canonical["']/i.test(source)) fail(file, "missing canonical link");

  for (const match of source.matchAll(/<(?:a|link|script|img)\b[^>]*?\b(?:href|src)=["']([^"']+)["'][^>]*>/gi)) {
    const target = localTarget(match[1]);
    if (target && !(await exists(target))) fail(file, `missing local resource: ${match[1]}`);
  }

  for (const match of source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      fail(file, `invalid JSON-LD: ${error.message}`);
    }
  }
  if (/<meta\s+property=["']og:type["']\s+content=["']article["']/i.test(source)) {
    if (!/data-seo=["']managed["']/i.test(source)) fail(file, "article page missing managed JSON-LD (run: node scripts/seo-sync.mjs)");
    if (!/data-seo=["']updated["']/i.test(source)) fail(file, "article page missing visible last-updated date (run: node scripts/seo-sync.mjs)");
  }
  const title = (source.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "";
  if (!title.trim()) fail(file, "missing title");

  for (const match of source.matchAll(/<a\b([^>]*\btarget=["']_blank["'][^>]*)>/gi)) {
    if (!/\brel=["'][^"']*noopener/i.test(match[1])) fail(file, "target=_blank link missing rel=noopener");
  }

  // Support assistant on every page (it reads contact links from site-config.js, loaded first).
  if (file !== "success.html") {
    const configAt = source.indexOf("assets/site-config.js");
    const chatAt = source.indexOf("assets/chat-widget.js");
    if (chatAt < 0) fail(file, "missing assets/chat-widget.js (copy the two script tags before </body> from an existing page)");
    else if (configAt < 0 || configAt > chatAt) fail(file, "assets/site-config.js must load before assets/chat-widget.js");
  }
}

const requiredSources = [
  "assets/home.js",
  "assets/home-i18n.js",
  "assets/site-config.js",
  "assets/site-links.js",
  "assets/application.js",
  "assets/success.js",
  "assets/css/home.css",
  "assets/css/application.css",
  "assets/css/success.css"
];
for (const file of requiredSources) {
  if (!(await exists(file))) fail(file, "required source file is missing");
}

for (const file of ["index.html", "apply.html", "success.html"]) {
  const source = await readFile(path.join(root, file), "utf8");
  const withoutStructuredData = source.replace(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    ""
  );
  if (/<style\b/i.test(source)) fail(file, "core page contains inline CSS");
  if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(withoutStructuredData)) {
    fail(file, "core page contains inline executable JavaScript");
  }
}

const configOnlyValues = [
  "portal.tminvgain.com/register",
  "formsubmit.co/ajax",
  "qm.qq.com/q/",
  "u.wechat.com/",
  "discord.gg/",
  "t.me/LiangFreddy"
];
for (const file of [...htmlFiles, ...(await readdir(path.join(root, "assets"))).filter((name) => name.endsWith(".js")).map((name) => `assets/${name}`)]) {
  if (file === "assets/site-config.js") continue;
  const source = await readFile(path.join(root, file), "utf8");
  for (const value of configOnlyValues) {
    if (source.includes(value)) fail(file, `duplicates centralized configuration value: ${value}`);
  }
}

const translationContext = { window: {} };
vm.createContext(translationContext);
vm.runInContext(await readFile(path.join(root, "assets/home-i18n.js"), "utf8"), translationContext);
const translations = translationContext.window.MAX_REBATE_TRANSLATIONS;
const locales = ["en", "zh-CN", "zh-TW", "ms", "th"];
const englishKeys = Object.keys(translations.en).sort();

for (const locale of locales) {
  if (!translations[locale]) {
    fail("assets/home-i18n.js", `missing locale: ${locale}`);
    continue;
  }
  const keys = Object.keys(translations[locale]).sort();
  const missing = englishKeys.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !englishKeys.includes(key));
  if (missing.length) fail("assets/home-i18n.js", `${locale} missing keys: ${missing.join(", ")}`);
  if (extra.length) fail("assets/home-i18n.js", `${locale} extra keys: ${extra.join(", ")}`);
}

const homeSource = await readFile(path.join(root, "index.html"), "utf8");
const usedTranslationKeys = [...new Set([...homeSource.matchAll(/data-i18n=["']([^"']+)["']/g)].map((match) => match[1]))];
const unknownTranslationKeys = usedTranslationKeys.filter((key) => !englishKeys.includes(key));
if (unknownTranslationKeys.length) fail("index.html", `unknown translation keys: ${unknownTranslationKeys.join(", ")}`);

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const file of contentPages.filter((name) => name !== "success.html")) {
  const url = file === "index.html" ? "https://max-rebate.com/" : `https://max-rebate.com/${file}`;
  if (!sitemap.includes(`<loc>${url}</loc>`)) fail("sitemap.xml", `missing page: ${file}`);
}

// hreflang: every alternate must exist and link back, or search engines ignore the whole set.
const fileOfUrl = (url) => (url === "https://max-rebate.com/" ? "index.html" : url.replace("https://max-rebate.com/", ""));
for (const file of contentPages) {
  const source = await readFile(path.join(root, file), "utf8");
  const self = file === "index.html" ? "https://max-rebate.com/" : `https://max-rebate.com/${file}`;
  for (const match of source.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)) {
    const target = fileOfUrl(match[2]);
    if (!(await exists(target))) {
      fail(file, `hreflang ${match[1]} points to a missing page: ${match[2]}`);
      continue;
    }
    const back = await readFile(path.join(root, target), "utf8");
    const linksBack = [...back.matchAll(/<link rel="alternate" hreflang="[^"]+" href="([^"]+)">/g)].some((m) => m[1] === self);
    if (!linksBack) fail(file, `hreflang ${match[1]} page ${target} does not link back`);
  }
}

if (failures.length) {
  console.error(`Site validation failed (${failures.length}):`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Site validation passed: ${contentPages.length} content pages checked.`);
