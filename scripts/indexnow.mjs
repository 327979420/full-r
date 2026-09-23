// Notify IndexNow (Bing, Yandex, Seznam, Naver…) about pages changed in a push.
//   node scripts/indexnow.mjs <before-sha>
// With no/zero SHA every page in sitemap.xml is submitted.

import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import process from "node:process";

const HOST = "max-rebate.com";
const SITE = `https://${HOST}`;
const keyFile = (await readdir(".")).find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
if (!keyFile) {
  console.error("IndexNow key file not found (expected <32 hex>.txt at repo root).");
  process.exit(1);
}
const key = keyFile.replace(".txt", "");

const before = process.argv[2] || "";
let files = [];
if (before && !/^0+$/.test(before)) {
  try {
    files = execFileSync("git", ["diff", "--name-only", `${before}..HEAD`], { encoding: "utf8" })
      .split("\n")
      .filter((name) => /^[^/]+\.html$/.test(name));
  } catch {
    files = [];
  }
}

let urls;
if (files.length) {
  urls = files
    .filter((name) => !name.startsWith("google") && name !== "success.html")
    .map((name) => (name === "index.html" ? `${SITE}/` : `${SITE}/${name}`));
} else {
  const sitemap = await readFile("sitemap.xml", "utf8");
  urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
urls = [...new Set(urls)];
if (!urls.length) {
  console.log("IndexNow: no page changes to submit.");
  process.exit(0);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key, keyLocation: `${SITE}/${keyFile}`, urlList: urls })
});
console.log(`IndexNow: submitted ${urls.length} URL(s), HTTP ${response.status}`);
urls.forEach((url) => console.log(`- ${url}`));
if (response.status >= 400 && response.status !== 429) process.exit(1);
