# Support assistant (Cloudflare Worker)

An AI chat widget for max-rebate.com. Visitors ask about TMGM rebates, account types and how to apply, and
Claude Haiku 4.5 answers using only what the site says. Anything it can't answer, or anything that needs a person,
gets Telegram and Discord buttons.

```
browser ── /api/chat ──▶ this Worker ──▶ Claude API (claude-haiku-4-5)
                              │
                              ├─ reads https://max-rebate.com/assets/chat-knowledge.json (cached 10 min)
                              └─ stores anonymous topics of unanswered questions in KV (90 days)
```

## What updates itself

- **Knowledge.** CI runs `scripts/build-chat-knowledge.mjs` on every push to `main`. It rebuilds
  `assets/chat-knowledge.json` from the pages (rates table, homepage FAQ, each page's answer card and FAQ). The
  Worker picks up the new file within 10 minutes. You never redeploy the Worker for content changes.
- **Unanswered questions → content.** When the assistant can't answer, it stores a short anonymous topic (no names,
  numbers or account details). Every Monday the weekly SEO workflow fetches these topics, and Claude turns recurring
  ones into FAQ entries or backlog articles in its PR. The assistant can answer them after the PR merges.

## One-time setup (about 10 minutes)

You need a Cloudflare login for the account that holds max-rebate.com, and an Anthropic API key from
console.anthropic.com.

```bash
cd chat-worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY   # paste your Anthropic API key when asked
npx wrangler secret put GAPS_TOKEN          # paste any long random string; save it for step 3
npx wrangler deploy
```

1. **Set a spending limit.** In the Anthropic Console, under Settings → Limits, set a monthly limit (for example
   $20). That limit is the hard cost ceiling. The Worker also limits each visitor to 8 messages a minute.
2. **Preview.** Open https://max-rebate.com/?chat=on and ask a few questions in different languages. The widget is
   still hidden from everyone else.
3. **Weekly loop.** In GitHub → Settings → Secrets → Actions, add `CHAT_GAPS_TOKEN` with the same value as
   `GAPS_TOKEN`.
4. **Go live.** In `wrangler.toml`, set `CHAT_ENABLED = "true"` and run `npx wrangler deploy` again. Turn it off the
   same way.

## Cost

- **Cloudflare Workers and KV:** the free plan covers this traffic.
- **Claude Haiku 4.5:** $1 per million input tokens and $5 per million output tokens. Cache reads cost 10% of the
  input price and cache writes 125%.
  - Each request sends about 10k tokens of knowledge.
  - The first message of a conversation costs about 1.5¢ (cache write).
  - Follow-ups within 5 minutes cost about 0.3¢ (cache read).
  - A typical 3-message chat comes to about 2¢, so 300 chats a month is about $6.
- **Checking actual spend:** run `npx wrangler tail` (or open Workers → Logs in the dashboard). Each chat logs its
  token `usage` and the cache hit, never the message text.

## Develop and test

```bash
(cd .. && node scripts/build-chat-knowledge.mjs)   # refresh the knowledge file from the pages
npm test                                           # runs the Worker locally against a stand-in Claude API (no key, no cost)
```

To change the assistant's behaviour, edit `RULES` in `src/index.js`. To change what it knows, edit the site pages.
