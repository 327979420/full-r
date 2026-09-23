// SEO sync: keeps structured data, visible "last updated" dates and sitemap.xml
// in step with git history. Safe to run repeatedly (idempotent).
//
//   node scripts/seo-sync.mjs          -> rewrite files in place
//   node scripts/seo-sync.mjs --check  -> exit 1 if anything is out of date
//
// Dates come from git: datePublished = first commit touching the file,
// dateModified = latest commit touching the file, ignoring commits whose
// message contains "[seo-sync]" (so this script's own commits never bump dates).
// Files not yet committed get today's date. Content edits are picked up after
// they are committed/merged; CI then runs this script on main.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const SITE = "https://max-rebate.com";
const ORG = {
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: "满返网 Max Rebate",
  url: `${SITE}/`,
  logo: `${SITE}/favicon.svg`
};
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
  const real = git(["log", "--format=%cs", "--invert-grep", "--grep=\\[seo-sync\\]", "--", file])
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

function syncArticle(source, file) {
  const lang = attr(source, /<html[^>]*\blang=["']([^"']+)["']/i) || "zh-CN";
  const h1 = strip(attr(source, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  const description = attr(source, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const { published, modified } = dates(file);

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

if (checkOnly && changed.length) {
  console.error(`SEO sync needed for: ${changed.join(", ")}\nRun: node scripts/seo-sync.mjs`);
  process.exit(1);
}
console.log(changed.length ? `SEO sync updated: ${changed.join(", ")}` : "SEO sync: everything up to date.");
