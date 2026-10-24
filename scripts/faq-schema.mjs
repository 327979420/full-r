// FAQPage structured data built from a page's visible <details> FAQ, so the
// markup always matches what visitors see (Google ignores or penalises FAQ
// markup that differs from the page). Used by seo-sync.mjs and
// build-locales.mjs; both apply it last, which keeps the output idempotent.
//
// Removes the managed block (data-seo="faq") and any hand-written FAQPage
// block, then appends a fresh block before </head> if the page has a FAQ.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

export const text = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name) => ENTITIES[name])
    .replace(/\s+/g, " ")
    .trim();

// The visible FAQ as plain-text question/answer pairs (also used for llms.txt).
export function faqItems(html) {
  return [...html.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)]
    .map(([, question, answer]) => ({ question: text(question), answer: text(answer) }))
    .filter((item) => item.question && item.answer);
}

export function syncFaq(html) {
  html = html.replace(/\s*<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (whole, json) => {
    if (/data-seo=["']faq["']/i.test(whole)) return "";
    try {
      if (JSON.parse(json)?.["@type"] === "FAQPage") return "";
    } catch {
      /* leave unparseable blocks untouched; validate-site reports them */
    }
    return whole;
  });

  const items = faqItems(html);
  if (!items.length) return html;

  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer }
    }))
  };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return html.replace(/<\/head>/i, `<script type="application/ld+json" data-seo="faq">${json}</script>\n</head>`);
}
