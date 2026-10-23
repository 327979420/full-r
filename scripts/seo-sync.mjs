// SEO sync: keeps structured data, visible "last updated" dates and sitemap.xml
// in step with git history. Safe to run repeatedly (idempotent).
//
//   node scripts/seo-sync.mjs          -> rewrite files in place
//   node scripts/seo-sync.mjs --check  -> exit 1 if anything is out of date
//
// Dates come from git: datePublished = first commit touching the file,
// dateModified = latest commit touching the file, ignoring commits whose
// message contains "[seo-sync]" (this script's own commits) or "[skip-date]"
// (minor edits such as adding related links, which should not look like a
// content update).
// Files not yet committed get today's date. Content edits are picked up after
// they are committed/merged; CI then runs this script on main.
//
// It also writes FAQPage markup from each page's visible FAQ (faq-schema.mjs),
// gives article pages a share image, and regenerates llms.txt (a plain-text
// map of the site for AI assistants) from page titles and descriptions, plus key facts
// (rates, languages, contacts) and the homepage FAQ in Chinese and English.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";
import { syncFaq, faqItems, text as faqText } from "./faq-schema.mjs";

const SITE = "https://max-rebate.com";
const ORG = {
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: "满返网 Max Rebate",
  alternateName: ["Max Rebate", "满返网", "Max Rebate 满返网", "max-rebate.com"],
  url: `${SITE}/`,
  logo: `${SITE}/assets/logo-512.png` // raster 512x512; search engines do not use SVG logos reliably
};
const DEFAULT_IMAGE = `${SITE}/assets/og-image.jpg`; // 1200x630
const EXCLUDE = new Set(["success.html"]);
const checkOnly = process.argv.includes("--check");
const root = process.cwd();
const today = new Date().toISOString().slice(0, 10);
const changed = [];

function git(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function dates(file) {
  const all = git(["log", "--follow", "--format=%cs", "--", file]).split("\n").filter(Boolean);
  const real = git(["log", "--format=%cs", "-E", "--invert-grep", "--grep=\\[(seo-sync|skip-date)\\]", "--", file])
    .split("\n")
    .filter(Boolean);
  const published = all.at(-1) || today;
  const modified = real[0] || published;
  return { published, modified };
}

const strip = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const attr = (source, re) => (source.match(re) || [])[1] || "";

function pageUrl(file) {
  return file === "index.html" ? `${SITE}/` : `${SITE}/${file}`;
}

function isArticle(source) {
  return /<meta\s+property=["']og:type["']\s+content=["']article["']/i.test(source);
}

function breadcrumb(source, file, h1) {
  const block = attr(source, /<div class="breadcrumb">([\s\S]*?)<\/div>/i);
  const items = [];
  if (block) {
    const parts = block.split(/\s\/\s/);
    parts.forEach((part, index) => {
      const href = attr(part, /href=["']([^"']+)["']/i);
      const name = strip(part);
      if (!name) return;
      let url = pageUrl(file);
      if (href) url = href === "index.html" || href.startsWith("index.html#") ? `${SITE}/${href.replace("index.html", "")}` : `${SITE}/${href}`;
      if (index === parts.length - 1) url = pageUrl(file);
      items.push({ name, url: url.replace(`${SITE}//`, `${SITE}/`) });
    });
  }
  if (!items.length) items.push({ name: "首页", url: `${SITE}/` }, { name: h1, url: pageUrl(file) });
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url }))
  };
}

// Article pages need a share image for link previews and Article markup.
// Social networks and search engines do not accept SVG, so fall back to the site default.
function shareImage(source) {
  const image = attr(source, /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (image && !/\.svg$/i.test(image)) return { source, image };
  const tags = `<meta property="og:image" content="${DEFAULT_IMAGE}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`;
  if (image) source = source.replace(/<meta\s+property=["']og:image["'][^>]*>/i, tags);
  else source = source.replace(/(<meta\s+property=["']og:type["'][^>]*>)/i, `$1${tags}`);
  if (!/<meta\s+name=["']twitter:card["']/i.test(source)) {
    source = source.replace(/(<meta\s+property=["']og:image:height["'][^>]*>)/i, `$1<meta name="twitter:card" content="summary_large_image">`);
  }
  return { source, image: DEFAULT_IMAGE };
}

function syncArticle(source, file) {
  const lang = attr(source, /<html[^>]*\blang=["']([^"']+)["']/i) || "zh-CN";
  const h1 = strip(attr(source, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  const description = attr(source, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const { published, modified } = dates(file);
  let image;
  ({ source, image } = shareImage(source));

  // Remove previously managed blocks and stand-alone Article blocks (their data is regenerated below).
  let headline = h1;
  source = source.replace(/\s*<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (whole, json) => {
    try {
      const data = JSON.parse(json);
      if (/data-seo=["']managed["']/i.test(whole)) {
        const article = (data["@graph"] || []).find((node) => node["@type"] === "Article");
        if (article?.headline) headline = article.headline;
        return "";
      }
      if (data && data["@type"] === "Article") {
        if (data.headline) headline = data.headline;
        return "";
      }
    } catch {
      /* leave unparseable blocks untouched; validate-site reports them */
    }
    return whole;
  });

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline,
        description,
        inLanguage: lang,
        datePublished: published,
        dateModified: modified,
        image,
        author: { "@id": ORG["@id"] },
        publisher: { "@id": ORG["@id"] },
        mainEntityOfPage: pageUrl(file)
      },
      breadcrumb(source, file, h1),
      ORG
    ]
  };
  const block = `<script type="application/ld+json" data-seo="managed">${JSON.stringify(graph)}</script>`;
  source = source.replace(/<\/head>/i, `${block}\n</head>`);

  // Visible last-updated line right after the hero intro paragraph.
  const label = lang.startsWith("en") ? "Last updated" : lang === "zh-TW" ? "最後更新" : "最后更新";
  const line = `<p class="updated" data-seo="updated"><time datetime="${modified}">${label}：${modified}</time></p>`;
  source = source.replace(/<p class="updated" data-seo="updated">[\s\S]*?<\/p>/i, "");
  source = source.replace(/(<\/h1>\s*<p>[\s\S]*?<\/p>)/i, `$1${line}`);
  if (lang.startsWith("en")) source = source.replace(`${label}：`, `${label}: `);
  return { source, modified };
}

const files = (await readdir(root))
  .filter((name) => name.endsWith(".html") && !name.startsWith("google") && !EXCLUDE.has(name))
  .sort();

const lastmod = {};
const pages = {};
for (const file of files) {
  const full = path.join(root, file);
  const original = await readFile(full, "utf8");
  if (/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(original)) continue;
  let next = original;
  if (isArticle(original)) {
    const result = syncArticle(original, file);
    next = result.source;
    lastmod[file] = result.modified;
  } else {
    lastmod[file] = dates(file).modified;
  }
  next = syncFaq(next);
  pages[file] = {
    title: strip(attr(next, /<title>([\s\S]*?)<\/title>/i)).replace(/\s*[｜|]\s*(满返网|Max Rebate)[^｜|]*$/, ""),
    description: attr(next, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i),
    article: isArticle(next)
  };
  if (next !== original) {
    changed.push(file);
    if (!checkOnly) await writeFile(full, next);
  }
}

// sitemap.xml: keep existing priority/changefreq, refresh lastmod, add new pages.
const sitemapPath = path.join(root, "sitemap.xml");
const oldSitemap = await readFile(sitemapPath, "utf8");
const meta = {};
for (const m of oldSitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
  const loc = attr(m[1], /<loc>([^<]+)<\/loc>/);
  meta[loc] = {
    changefreq: attr(m[1], /<changefreq>([^<]+)<\/changefreq>/),
    priority: attr(m[1], /<priority>([^<]+)<\/priority>/)
  };
}
const order = Object.keys(meta);
const urls = files.filter((f) => lastmod[f]).map((f) => pageUrl(f));
urls.sort((a, b) => {
  const ia = order.indexOf(a), ib = order.indexOf(b);
  return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib) || a.localeCompare(b);
});
const lines = urls.map((url) => {
  const file = url === `${SITE}/` ? "index.html" : url.slice(SITE.length + 1);
  const m = meta[url] || { changefreq: "monthly", priority: "0.6" };
  let entry = `  <url><loc>${url}</loc><lastmod>${lastmod[file]}</lastmod>`;
  if (m.changefreq) entry += `<changefreq>${m.changefreq}</changefreq>`;
  if (m.priority) entry += `<priority>${m.priority}</priority>`;
  return `${entry}</url>`;
});
const newSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join("\n")}\n</urlset>\n`;
if (newSitemap !== oldSitemap) {
  changed.push("sitemap.xml");
  if (!checkOnly) await writeFile(sitemapPath, newSitemap);
}

// llms.txt: what the site is and where each answer lives, in sitemap order.
const organization = JSON.parse(attr(await readFile(path.join(root, "index.html"), "utf8"), /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i))
  ["@graph"].find((node) => node["@type"] === "Organization");
const sections = [
  ["首页与语言版本 / Homepage and languages", (f) => f === "index.html" || /^(en|zh-hant|ms|th)\.html$/.test(f)],
  ["指南 / Guides", (f) => pages[f].article],
  ["图文教程 / Step-by-step tutorials", (f) => f.startsWith("tutorial-")],
  ["申请、联系与政策 / Apply, contact and policies", () => true]
];
const listed = new Set();
const llmsLines = [`# ${organization.name}`, "", `> ${organization.description}`, "", `${pages["index.html"].description}`];

// Key facts and FAQ, quoted from what the site already shows so AI answers can cite one place.
// Rates come from the answer table on tmgm-fan-yong.html; contacts from assets/site-config.js.
const homeSource = await readFile(path.join(root, "index.html"), "utf8");
const configContext = { window: {} };
vm.createContext(configContext);
vm.runInContext(await readFile(path.join(root, "assets/site-config.js"), "utf8"), configContext);
const { contacts } = configContext.window.MAX_REBATE_CONFIG;
const LANGUAGE_NAMES = { "zh-CN": "简体中文", "zh-Hant": "繁體中文", en: "English", ms: "Bahasa Melayu", th: "ไทย" };
const languages = [...homeSource.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)]
  .filter(([, lang]) => LANGUAGE_NAMES[lang])
  .map(([, lang, href]) => `[${LANGUAGE_NAMES[lang]}](${href})`);
const rateTable = attr(
  attr(await readFile(path.join(root, "tmgm-fan-yong.html"), "utf8"), /<section class="card answer" id="answer">([\s\S]*?)<\/section>/i),
  /<table>([\s\S]*?)<\/table>/i
);
const rateRows = [...rateTable.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map(([, row]) =>
  [...row.matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/gi)].map(([, cell]) => faqText(cell))
);
llmsLines.push("", "## 关键事实 / Key facts", "");
llmsLines.push(`- 网站 / Website: ${SITE}/ — ${organization.alternateName.join(" · ")}`);
if (languages.length) llmsLines.push(`- 语言 / Languages: ${languages.join(" · ")}`);
llmsLines.push(`- 提交申请 / Apply: ${SITE}/apply.html`);
llmsLines.push(`- 联系 / Contact: Discord ${contacts.discord} · Telegram ${contacts.telegram}`);
if (rateRows.length > 1) {
  llmsLines.push("", `TMGM ${rateRows[0][0]}，满返网当前方案；实际资格和金额以账户组别、平台后台记录与审核为准（来源：${SITE}/tmgm-fan-yong.html）：`, "");
  rateRows.forEach((row, i) => {
    llmsLines.push(`| ${row.join(" | ")} |`);
    if (i === 0) llmsLines.push(`|${" --- |".repeat(row.length)}`);
  });
}
for (const [heading, file] of [["常见问题", "index.html"], ["FAQ (English)", "en.html"]]) {
  const items = faqItems(await readFile(path.join(root, file), "utf8"));
  if (!items.length) continue;
  llmsLines.push("", `## ${heading}`, "", `Source: ${pageUrl(file)}#faq`, "");
  for (const item of items) llmsLines.push(`- **${item.question}** ${item.answer}`);
}

for (const [heading, match] of sections) {
  const items = urls
    .map((url) => (url === `${SITE}/` ? "index.html" : url.slice(SITE.length + 1)))
    .filter((f) => !listed.has(f) && match(f));
  if (!items.length) continue;
  llmsLines.push("", `## ${heading}`, "");
  for (const f of items) {
    listed.add(f);
    llmsLines.push(`- [${pages[f].title}](${pageUrl(f)})${pages[f].description ? `: ${pages[f].description}` : ""}`);
  }
}
const llmsPath = path.join(root, "llms.txt");
const newLlms = `${llmsLines.join("\n")}\n`;
const oldLlms = await readFile(llmsPath, "utf8").catch(() => "");
if (newLlms !== oldLlms) {
  changed.push("llms.txt");
  if (!checkOnly) await writeFile(llmsPath, newLlms);
}

if (checkOnly && changed.length) {
  console.error(`SEO sync needed for: ${changed.join(", ")}\nRun: node scripts/seo-sync.mjs`);
  process.exit(1);
}
console.log(changed.length ? `SEO sync updated: ${changed.join(", ")}` : "SEO sync: everything up to date.");
