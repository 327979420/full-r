// Build assets/chat-knowledge.json: the only facts the support assistant may use.
//
// The chat Worker (chat-worker/) downloads this file from the live site and caches it for
// ten minutes, so every content change that reaches main reaches the assistant without
// redeploying the Worker. CI runs this script on main next to seo-sync.
//
// It keeps the knowledge short to keep each chat cheap: homepage rates and FAQ, plus for every
// page its title, description, one-line answer and FAQ (or the opening text when a page has
// neither). The output has no timestamps, so it only changes when the content does.
//
//   node scripts/build-chat-knowledge.mjs          -> update the file
//   node scripts/build-chat-knowledge.mjs --check  -> exit 1 if it is out of date

import { readFile, writeFile, readdir } from "node:fs/promises";
import vm from "node:vm";
import process from "node:process";

const SITE = "https://max-rebate.com";
const OUT = "assets/chat-knowledge.json";
// Generated translations of index.html and pages with nothing to answer from.
const SKIP = new Set(["index.html", "en.html", "zh-hant.html", "ms.html", "th.html", "success.html"]);
const FALLBACK_CHARS = 900;
const checkOnly = process.argv.includes("--check");

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
const text = (html) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
const first = (html, re) => (html.match(re) || [])[1] || "";
const clip = (s, n) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

function faqOf(html) {
  const section = first(html, /<section class="card faq"[^>]*>([\s\S]*?)<\/section>/i);
  return [...section.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/gi)].map((m) => ({
    q: text(m[1]),
    a: text(m[2])
  }));
}

function page(file, html) {
  const entry = {
    url: `${SITE}/${file}`,
    lang: first(html, /<html[^>]*\blang="([^"]+)"/i) || "zh-CN",
    title: text(first(html, /<title>([\s\S]*?)<\/title>/i)),
    description: decode(first(html, /<meta name="description" content="([^"]*)"/i))
  };
  const answer = first(html, /<section class="card answer"[^>]*>([\s\S]*?)<\/section>/i);
  if (answer) entry.answer = text(answer.replace(/<h2[\s\S]*?<\/h2>/i, ""));
  const faq = faqOf(html);
  if (faq.length) entry.faq = faq;
  if (!answer && !faq.length) {
    const main = first(html, /<main[^>]*>([\s\S]*?)<\/main>/i) || first(html, /<body[^>]*>([\s\S]*?)<\/body>/i);
    entry.text = clip(text(main.replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, " ")), FALLBACK_CHARS);
  }
  return entry;
}

const context = { window: {} };
vm.createContext(context);
vm.runInContext(await readFile("assets/site-config.js", "utf8"), context);
vm.runInContext(await readFile("assets/home-i18n.js", "utf8"), context);
const config = context.window.MAX_REBATE_CONFIG;
const T = context.window.MAX_REBATE_TRANSLATIONS;

const index = await readFile("index.html", "utf8");
const table = first(index, /<table class="rebate-table">([\s\S]*?)<\/table>/i);
const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
  [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => text(cell[1])).join(" | ")
);
const faqKeys = Object.keys(T.en).filter((key) => /^faq\d+q$/.test(key));
const homepageFaq = (lang) => faqKeys.map((key) => ({ q: T[lang][key], a: T[lang][key.replace(/q$/, "a")] }));
const homepageFacts = [
  "heroDesc", "ratesDesc", "tableFoot", "proofNote", "why0d", "why1d", "why2d", "why3d", "why4d",
  "pathNewDesc", "pathExistingDesc", "pathIbDesc", "pathSafety", "calcHint", "footerIdentity", "risk"
].map((key) => T.en[key]).filter(Boolean);

const pages = [];
for (const file of (await readdir(".")).filter((name) => name.endsWith(".html") && !name.startsWith("google") && !SKIP.has(name)).sort()) {
  pages.push(page(file, await readFile(file, "utf8")));
}

const knowledge = {
  site: SITE,
  homepage: {
    url: `${SITE}/`,
    languages: { "zh-CN": `${SITE}/`, "zh-TW": `${SITE}/zh-hant.html`, en: `${SITE}/en.html`, ms: `${SITE}/ms.html`, th: `${SITE}/th.html` },
    applyUrl: `${SITE}/apply.html`,
    rebatePerLotUsd: Object.fromEntries(
      Object.entries(config.rebateAccounts).map(([account, r]) => [account, { min: r.min, max: r.max, feePerLot: r.fee }])
    ),
    rebateTable: rows,
    facts: homepageFacts,
    faq: { en: homepageFaq("en"), "zh-CN": homepageFaq("zh-CN") }
  },
  pages
};

const next = `${JSON.stringify(knowledge, null, 1)}\n`;
let current = "";
try {
  current = await readFile(OUT, "utf8");
} catch {
  /* first run */
}
if (next === current) {
  console.log("Chat knowledge: up to date.");
} else if (checkOnly) {
  console.error(`Chat knowledge out of date.\nRun: node scripts/build-chat-knowledge.mjs`);
  process.exit(1);
} else {
  await writeFile(OUT, next);
  console.log(`Chat knowledge updated: ${OUT} (${pages.length} pages, ${next.length} characters)`);
}
