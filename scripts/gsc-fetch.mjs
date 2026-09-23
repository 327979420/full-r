// Pull Google Search Console data for the weekly SEO review.
//
//   GSC_SA_KEY='<service-account JSON>' node scripts/gsc-fetch.mjs
//
// Writes (git-ignored, never committed because the repo is public):
//   .seo-data/gsc.json     raw numbers: last 28 days vs the 28 days before, by query and by page
//   .seo-data/index.json   URL Inspection result (indexed or not, last crawl) for every sitemap URL
//   .seo-data/summary.md   short human/agent-readable summary
// No dependencies: signs the service-account JWT with node:crypto.

import { createSign } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const HOST = "max-rebate.com";
const OUT = ".seo-data";
const raw = process.env.GSC_SA_KEY;
if (!raw) {
  console.log("GSC_SA_KEY is not set; skipping Search Console fetch.");
  process.exit(0);
}
const key = JSON.parse(raw);

const b64url = (value) => Buffer.from(value).toString("base64url");
async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${signer.sign(key.private_key).toString("base64url")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt })
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token error ${res.status}: ${JSON.stringify(body)}`);
  return body.access_token;
}

const token = await accessToken();
async function api(url, body) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${url} -> ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return json;
}

// Find the Search Console property (domain or URL-prefix) for this site.
const sites = (await api("https://www.googleapis.com/webmasters/v3/sites")).siteEntry || [];
const site =
  sites.find((s) => s.siteUrl === `sc-domain:${HOST}`) ||
  sites.find((s) => s.siteUrl === `https://${HOST}/`) ||
  sites.find((s) => s.siteUrl.includes(HOST));
if (!site) {
  console.error(`No Search Console property for ${HOST} is shared with ${key.client_email}.`);
  console.error("Add this email as a user in Search Console → Settings → Users and permissions.");
  process.exit(1);
}
const siteUrl = encodeURIComponent(site.siteUrl);

const day = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
// Search Console data lags ~2-3 days.
const current = { startDate: day(30), endDate: day(3) };
const previous = { startDate: day(58), endDate: day(31) };

async function analytics(range, dimensions) {
  const data = await api(`https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`, {
    ...range,
    dimensions,
    rowLimit: 500
  });
  return (data.rows || []).map((r) => ({
    keys: r.keys,
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: Number((r.ctr * 100).toFixed(2)),
    position: Number(r.position.toFixed(1))
  }));
}

const gsc = {
  property: site.siteUrl,
  current,
  previous,
  byQuery: { current: await analytics(current, ["query"]), previous: await analytics(previous, ["query"]) },
  byPage: { current: await analytics(current, ["page"]), previous: await analytics(previous, ["page"]) },
  byQueryPage: await analytics(current, ["query", "page"])
};

// URL Inspection for every URL in the sitemap (quota: 2,000/day per property).
const sitemap = await readFile("sitemap.xml", "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const index = [];
for (const url of urls) {
  try {
    const r = await api("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
      inspectionUrl: url,
      siteUrl: site.siteUrl,
      languageCode: "zh-CN"
    });
    const s = r.inspectionResult?.indexStatusResult || {};
    index.push({
      url,
      verdict: s.verdict,
      coverageState: s.coverageState,
      lastCrawlTime: s.lastCrawlTime,
      googleCanonical: s.googleCanonical,
      userCanonical: s.userCanonical
    });
  } catch (error) {
    index.push({ url, error: String(error.message).slice(0, 200) });
  }
}

const total = (rows) =>
  rows.reduce((a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }), { clicks: 0, impressions: 0 });
const now = total(gsc.byPage.current);
const before = total(gsc.byPage.previous);
const indexed = index.filter((i) => i.verdict === "PASS").length;
const summary = [
  `# Search Console summary (${current.startDate} → ${current.endDate})`,
  "",
  `Property: ${site.siteUrl}`,
  `Clicks: ${now.clicks} (previous 28 days: ${before.clicks})`,
  `Impressions: ${now.impressions} (previous 28 days: ${before.impressions})`,
  `Indexed: ${indexed}/${urls.length} sitemap URLs`,
  "",
  "## Not indexed",
  ...index.filter((i) => i.verdict !== "PASS").map((i) => `- ${i.url}: ${i.coverageState || i.error || i.verdict}`),
  "",
  "## Top queries (current period)",
  ...gsc.byQuery.current
    .slice(0, 30)
    .map((r) => `- ${r.keys[0]} | impressions ${r.impressions} | clicks ${r.clicks} | CTR ${r.ctr}% | pos ${r.position}`),
  "",
  "## Pages (current period)",
  ...gsc.byPage.current.map((r) => `- ${r.keys[0]} | impressions ${r.impressions} | clicks ${r.clicks} | CTR ${r.ctr}% | pos ${r.position}`)
].join("\n");

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/gsc.json`, JSON.stringify(gsc, null, 2));
await writeFile(`${OUT}/index.json`, JSON.stringify(index, null, 2));
await writeFile(`${OUT}/summary.md`, `${summary}\n`);
console.log(`Search Console data written to ${OUT}/ (${indexed}/${urls.length} indexed).`);
