// End-to-end test of the Worker in the real Workers runtime (wrangler dev), with local stand-ins
// for the Claude API, Telegram and the site, so it needs no keys and costs nothing.
//
//   npm test        (from chat-worker/; run `node scripts/build-chat-knowledge.mjs` at the repo root first)

import { createServer } from "node:http";
import { readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const MOCK_PORT = 8799;
const WORKER_PORT = 8788;
const WORKER = `http://127.0.0.1:${WORKER_PORT}`;
const ORIGIN = "http://localhost:8791";

let nextReply = { reply: "STD 标准账户黄金每手返 $20。", needs_human: false, missing_topic: "" };
let upstreamStatus = 200;
const requests = [];
const telegramCalls = [];
let nextTelegramId = 900;

const mock = createServer(async (req, res) => {
  if (req.url === "/assets/chat-knowledge.json") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(await readFile(new URL("../../assets/chat-knowledge.json", import.meta.url)));
    return;
  }
  if (req.method === "POST" && req.url.startsWith("/bottest-bot-token/")) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const call = { method: req.url.split("/").pop(), body: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
    call.result = call.method === "sendMessage" ? { message_id: nextTelegramId++ } : true;
    telegramCalls.push(call);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, result: call.result }));
    return;
  }
  if (req.method === "POST" && req.url.startsWith("/v1/messages")) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({ headers: req.headers, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
    if (upstreamStatus !== 200) {
      res.writeHead(upstreamStatus, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "mock failure" } }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-haiku-4-5",
        content: [{ type: "text", text: JSON.stringify(nextReply) }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 34, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
      })
    );
    return;
  }
  res.writeHead(404).end();
});
await new Promise((resolve) => mock.listen(MOCK_PORT, "127.0.0.1", resolve));

const vars = {
  SITE_ORIGIN: `http://127.0.0.1:${MOCK_PORT}`,
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
  ANTHROPIC_API_KEY: "test-key-not-real",
  GAPS_TOKEN: "test-gaps-token",
  ALLOW_LOCALHOST: "true",
  CHAT_ENABLED: "true",
  TELEGRAM_BOT_TOKEN: "test-bot-token",
  TELEGRAM_API_BASE: `http://127.0.0.1:${MOCK_PORT}`,
  TELEGRAM_OWNER: "owner_user"
};
const WEBHOOK_SECRET = createHash("sha256").update("max-rebate-webhook:test-bot-token").digest("hex");
// Start from empty local KV and rate-limit counters.
await rm(new URL("../.wrangler/state", import.meta.url), { recursive: true, force: true });
const wrangler = spawn(
  "npx",
  ["wrangler", "dev", "--test-scheduled", "--port", String(WORKER_PORT), "--ip", "127.0.0.1", ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])],
  { cwd: new URL("..", import.meta.url), stdio: ["ignore", "pipe", "pipe"] }
);
let log = "";
wrangler.stdout.on("data", (d) => (log += d));
wrangler.stderr.on("data", (d) => (log += d));

async function waitForWorker() {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`${WORKER}/api/chat`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`wrangler dev did not start:\n${log}`);
}

// Each request gets its own client address so only the rate-limit test hits the per-visitor limit.
let visitor = 0;
const post = (body, headers = { Origin: ORIGIN }) =>
  fetch(`${WORKER}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": `10.0.0.${++visitor}`, ...headers },
    body: JSON.stringify(body)
  });
const webhook = (message, secret = WEBHOOK_SECRET) =>
  fetch(`${WORKER}/api/chat/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(secret ? { "X-Telegram-Bot-Api-Secret-Token": secret } : {}) },
    body: JSON.stringify({ update_id: Date.now(), message })
  });
const fromOwner = (fields) => ({ message_id: Math.floor(Math.random() * 1e6), chat: { id: 4242, type: "private" }, from: { username: "Owner_User" }, ...fields });
const lastSent = () => telegramCalls.filter((c) => c.method === "sendMessage").at(-1);
const settle = () => new Promise((r) => setTimeout(r, 300));
const ask = (content, extra = {}, headers) => post({ messages: [{ role: "user", content }], lang: "zh-CN", page: "/", ...extra }, headers);

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push(`ok   ${name}`);
  } catch (error) {
    results.push(`FAIL ${name}\n     ${error.message}`);
  }
}

try {
  await waitForWorker();

  await test("answers and sends a cached, structured Haiku request", async () => {
    const res = await ask("TMGM 黄金返佣多少？", { lang: "zh-CN", page: "/tmgm-fan-yong.html" });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { reply: nextReply.reply, needs_human: false });
    const sent = requests.at(-1).body;
    assert.equal(sent.model, "claude-haiku-4-5");
    assert.deepEqual(sent.system[0].cache_control, { type: "ephemeral" });
    const file = await readFile(new URL("../../assets/chat-knowledge.json", import.meta.url), "utf8");
    assert.ok(sent.system[0].text.endsWith(JSON.stringify(JSON.parse(file))), "knowledge in the prompt must equal the file exactly");
    assert.equal(sent.system[1].text, "Page language: zh-CN. Page: /tmgm-fan-yong.html");
    assert.equal(sent.output_config.format.type, "json_schema");
    assert.equal(requests.at(-1).headers["x-api-key"], "test-key-not-real");
  });

  await test("system prompt is byte-identical across requests (cacheable)", async () => {
    await ask("第二个问题");
    const [a, b] = [requests.at(-2).body.system[0].text, requests.at(-1).body.system[0].text];
    if (a !== b) {
      await writeFile(new URL("../.wrangler/prompt-a.txt", import.meta.url), a);
      await writeFile(new URL("../.wrangler/prompt-b.txt", import.meta.url), b);
    }
    assert.ok(a === b, "system prompts differ (written to .wrangler/prompt-a.txt and prompt-b.txt)");
  });

  await test("keeps the last 12 turns, merged and starting with the visitor", async () => {
    const history = [{ role: "assistant", content: "hi" }];
    for (let i = 0; i < 20; i++) history.push({ role: i % 2 ? "assistant" : "user", content: `m${i}` });
    history.push({ role: "user", content: "extra" });
    const res = await post({ messages: history, lang: "en", page: "/en.html" });
    assert.equal(res.status, 200);
    const sent = requests.at(-1).body.messages;
    assert.equal(sent[0].role, "user");
    assert.equal(sent.at(-1).role, "user");
    assert.ok(sent.length <= 12);
    assert.ok(sent.every((m, i) => i === 0 || m.role !== sent[i - 1].role));
  });

  await test("status endpoint reports CHAT_ENABLED", async () => {
    const res = await fetch(`${WORKER}/api/chat/status`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { enabled: true });
  });

  await test("rejects requests from other origins", async () => {
    assert.equal((await post({ messages: [{ role: "user", content: "x" }] }, { Origin: "https://evil.example" })).status, 403);
    assert.equal((await post({ messages: [{ role: "user", content: "x" }] }, {})).status, 403);
  });

  await test("rejects malformed conversations", async () => {
    assert.equal((await post({ messages: [{ role: "assistant", content: "x" }] })).status, 400);
    assert.equal((await post({ messages: "nope" })).status, 400);
    assert.equal((await post({ messages: [{ role: "system", content: "x" }] })).status, 400);
  });

  await test("unanswered question: hands off and records an anonymous topic", async () => {
    nextReply = { reply: "这个问题我不确定，请通过 Telegram 联系我们。", needs_human: false, missing_topic: "返佣能否转到银行卡" };
    const res = await ask("返佣可以直接转银行卡吗？");
    assert.deepEqual(await res.json(), { reply: nextReply.reply, needs_human: true });
    await new Promise((r) => setTimeout(r, 300));
    const gaps = await fetch(`${WORKER}/api/chat/gaps`, { headers: { Authorization: "Bearer test-gaps-token" } });
    assert.equal(gaps.status, 200);
    const { gaps: list } = await gaps.json();
    assert.ok(list.some((g) => g.topic === "返佣能否转到银行卡" && g.lang === "zh-CN" && /^\d{4}-\d{2}-\d{2}$/.test(g.date)));
    nextReply = { reply: "ok", needs_human: false, missing_topic: "" };
  });

  await test("gaps endpoint needs the token", async () => {
    assert.equal((await fetch(`${WORKER}/api/chat/gaps`)).status, 401);
    assert.equal((await fetch(`${WORKER}/api/chat/gaps`, { headers: { Authorization: "Bearer wrong" } })).status, 401);
  });

  await test("upstream failure returns 502 without details", async () => {
    upstreamStatus = 500;
    const res = await ask("hello");
    upstreamStatus = 200;
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: "upstream" });
  });

  await test("cron registers the Telegram webhook once", async () => {
    await fetch(`${WORKER}/__scheduled?cron=*%2F5+*+*+*+*`);
    await fetch(`${WORKER}/__scheduled?cron=*%2F5+*+*+*+*`);
    const calls = telegramCalls.filter((c) => c.method === "setWebhook");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.url, `${vars.SITE_ORIGIN}/api/chat/telegram`);
    assert.equal(calls[0].body.secret_token, WEBHOOK_SECRET);
    assert.deepEqual(calls[0].body.allowed_updates, ["message"]);
  });

  await test("webhook rejects calls without Telegram's secret", async () => {
    assert.equal((await webhook(fromOwner({ text: "/start" }), "")).status, 401);
    assert.equal((await webhook(fromOwner({ text: "/start" }), "wrong")).status, 401);
  });

  await test("the owner's Start connects; strangers are ignored", async () => {
    await webhook({ message_id: 1, chat: { id: 777, type: "private" }, from: { username: "someone" }, text: "/start" });
    assert.ok(!telegramCalls.some((c) => c.body.chat_id === 777));
    await webhook(fromOwner({ text: "/start" }));
    assert.equal(lastSent().body.chat_id, "4242");
    assert.match(lastSent().body.text, /Connected/);
  });

  const CONV = "conv0000000000000001";
  let alertId;
  await test("a visitor who needs a person reaches the owner, and the reply comes back", async () => {
    nextReply = { reply: "已通知客服，稍后会在这里回复你。", needs_human: true, missing_topic: "" };
    const res = await ask("我的返佣没到账", { conversation: CONV, page: "/th.html", lang: "th" });
    assert.deepEqual(await res.json(), { reply: nextReply.reply, needs_human: true });
    await settle();
    const alert = lastSent();
    assert.equal(alert.body.chat_id, "4242");
    assert.match(alert.body.text, /我的返佣没到账/);
    assert.match(alert.body.text, /Reply to this message/);
    alertId = alert.result.message_id;
    assert.equal((await webhook(fromOwner({ text: "Hi, Freddy here", reply_to_message: { message_id: alertId } }))).status, 200);
    assert.ok(telegramCalls.some((c) => c.method === "setMessageReaction"));
    const inbox = await (await fetch(`${WORKER}/api/chat/inbox?c=${CONV}&after=0`)).json();
    assert.deepEqual(inbox, { messages: [{ n: 1, text: "Hi, Freddy here" }], human: true });
    assert.deepEqual((await (await fetch(`${WORKER}/api/chat/inbox?c=${CONV}&after=1`)).json()).messages, []);
  });

  await test("while the owner is chatting, visitor messages go to Telegram, not the AI", async () => {
    const before = requests.length;
    const res = await ask("还在吗？", { conversation: CONV });
    assert.deepEqual(await res.json(), { forwarded: true, needs_human: true });
    await settle();
    assert.equal(requests.length, before, "the AI must not be called");
    assert.match(lastSent().body.text, /还在吗？/);
    await webhook(fromOwner({ text: "Yes, checking now", reply_to_message: { message_id: lastSent().result.message_id } }));
    const inbox = await (await fetch(`${WORKER}/api/chat/inbox?c=${CONV}&after=1`)).json();
    assert.deepEqual(inbox.messages, [{ n: 2, text: "Yes, checking now" }]);
  });

  await test("owner messages that are not replies get instructions", async () => {
    await webhook(fromOwner({ text: "hello" }));
    assert.match(lastSent().body.text, /swipe left/);
  });

  await test("inbox ignores invalid conversation ids", async () => {
    assert.deepEqual(await (await fetch(`${WORKER}/api/chat/inbox?c=BAD&after=0`)).json(), { messages: [], human: false });
  });

  await test("at most 5 alerts per conversation", async () => {
    const before = telegramCalls.filter((c) => c.method === "sendMessage").length;
    for (let i = 0; i < 7; i++) await ask(`help ${i}`, { conversation: "conv0000000000000002" });
    await settle();
    assert.equal(telegramCalls.filter((c) => c.method === "sendMessage").length - before, 5);
    nextReply = { reply: "ok", needs_human: false, missing_topic: "" };
  });

  await test("per-visitor rate limit kicks in", async () => {
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await ask(`q${i}`, {}, { Origin: ORIGIN, "CF-Connecting-IP": "10.9.9.9" })).status);
    assert.ok(statuses.includes(429), `statuses: ${statuses.join(",")}`);
  });
} finally {
  wrangler.kill("SIGTERM");
  mock.close();
}

console.log(results.join("\n"));
if (results.some((r) => r.startsWith("FAIL"))) process.exit(1);
