(() => {
  "use strict";

  // PostHog visitor analytics (US cloud), in the same project as freddyliang.com. The project key is public by design.
  // Only the live site reports; local previews stay silent. No session replay. Form contents are never sent.
  const POSTHOG_KEY = "phc_tT898VwuWXwX7s5zaAaJjuzz9qKa2j3tNqrKsxn5W6d8";
  const POSTHOG_HOST = "https://us.i.posthog.com";
  const LIVE_HOSTS = new Set(["max-rebate.com", "www.max-rebate.com"]);

  // Referrer host (or utm_source) -> assistant name. Matches the host itself or any subdomain.
  const AI_SOURCES = [
    ["chatgpt.com", "chatgpt"], ["chat.openai.com", "chatgpt"], ["openai.com", "chatgpt"],
    ["perplexity.ai", "perplexity"],
    ["gemini.google.com", "gemini"], ["bard.google.com", "gemini"],
    ["copilot.microsoft.com", "copilot"], ["copilot.com", "copilot"],
    ["claude.ai", "claude"],
    ["deepseek.com", "deepseek"],
    ["kimi.moonshot.cn", "kimi"], ["kimi.com", "kimi"],
    ["doubao.com", "doubao"],
    ["yuanbao.tencent.com", "yuanbao"],
    ["tongyi.aliyun.com", "qwen"], ["qianwen.com", "qwen"], ["tongyi.com", "qwen"],
    ["metaso.cn", "metaso"],
    ["grok.com", "grok"],
    ["poe.com", "poe"],
    ["chat.mistral.ai", "mistral"],
    ["you.com", "you"]
  ];

  // Query parameters worth keeping on page URLs; everything else (such as the application reference) is dropped.
  const KEPT_PARAMS = /^(utm_[a-z]+|from|new|lang|type)$/;

  const NOTE = {
    "zh-CN": { text: "本站使用 PostHog 统计访问情况，帮助改进内容。", off: "不参与统计", on: "已关闭统计，重新开启", policy: "隐私政策" },
    "zh-TW": { text: "本站使用 PostHog 統計瀏覽情況，協助改進內容。", off: "不參與統計", on: "已關閉統計，重新開啟", policy: "私隱政策" },
    en: { text: "This site uses PostHog to measure visits and improve its content.", off: "Opt out", on: "Opted out. Opt back in", policy: "Privacy Policy" },
    ms: { text: "Laman ini menggunakan PostHog untuk mengukur lawatan dan menambah baik kandungan.", off: "Tarik diri", on: "Telah tarik diri. Sertai semula", policy: "Privasi" },
    th: { text: "เว็บไซต์นี้ใช้ PostHog วัดการเข้าชมเพื่อปรับปรุงเนื้อหา", off: "ไม่เข้าร่วม", on: "ปิดการวัดแล้ว เปิดอีกครั้ง", policy: "ความเป็นส่วนตัว" }
  };

  function matchAiSource(value) {
    const host = String(value || "").toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0];
    if (!host) return "";
    for (const [domain, name] of AI_SOURCES) {
      if (host === domain || host.endsWith("." + domain)) return name;
    }
    return "";
  }

  function aiSource(referrer, search) {
    let fromReferrer = "";
    try { fromReferrer = referrer ? matchAiSource(new URL(referrer).hostname) : ""; } catch (error) { fromReferrer = ""; }
    if (fromReferrer) return fromReferrer;
    return matchAiSource(new URLSearchParams(search).get("utm_source"));
  }

  function cleanUrl(value) {
    if (typeof value !== "string" || !value) return value;
    try {
      const url = new URL(value);
      for (const key of [...url.searchParams.keys()]) {
        if (!KEPT_PARAMS.test(key)) url.searchParams.delete(key);
      }
      return url.href;
    } catch (error) {
      return value;
    }
  }

  function noteText() {
    const lang = document.documentElement.lang || "zh-CN";
    if (NOTE[lang]) return NOTE[lang];
    if (/^zh-(TW|HK|Hant)/i.test(lang)) return NOTE["zh-TW"];
    if (/^zh/i.test(lang)) return NOTE["zh-CN"];
    return NOTE[lang.slice(0, 2)] || NOTE.en;
  }

  // Where on the page a click happened, so the same button in the hero and the footer can be told apart.
  function placement(element) {
    const area = element.closest("[id], header, footer, nav, section");
    if (!area) return "";
    return area.id || area.tagName.toLowerCase();
  }

  function contactChannel(link, url) {
    if (link.dataset.contact) return link.dataset.contact;
    if (url.protocol === "mailto:") return "email";
    const contacts = (window.MAX_REBATE_CONFIG && window.MAX_REBATE_CONFIG.contacts) || {};
    for (const [name, href] of Object.entries(contacts)) {
      try { if (new URL(href).hostname === url.hostname) return name; } catch (error) { /* ignore malformed config */ }
    }
    if (url.hostname === "t.me") return "telegram";
    if (/(^|\.)discord\.(gg|com)$/.test(url.hostname)) return "discord";
    return "";
  }

  function start(ph) {
    const source = aiSource(document.referrer, location.search);
    if (source) {
      ph.register_for_session({ ai_source: source });
      ph.capture("ai_referral", { ai_source: source, landing_page: location.pathname });
    }

    // On success.html the form has already been accepted; record the application type only.
    if (/\/success(\.html)?$/.test(location.pathname)) {
      const params = new URLSearchParams(location.search);
      if (params.get("ref")) ph.capture("application_submitted", { application_type: params.get("type") || "", site_language: params.get("lang") || "" });
    }

    document.addEventListener("click", (event) => {
      const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;
      let url;
      try { url = new URL(link.href, location.href); } catch (error) { return; }
      const where = placement(link);
      const label = (link.innerText || link.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);

      if (link.classList.contains("referral") || url.hostname === "portal.tminvgain.com") {
        ph.capture("open_account_clicked", { placement: where, label });
        return;
      }
      const channel = contactChannel(link, url);
      if (channel) {
        ph.capture("contact_clicked", { channel, placement: where, label });
        return;
      }
      if (url.origin === location.origin && /\/apply(\.html)?$/.test(url.pathname)) {
        ph.capture("apply_clicked", { from: url.searchParams.get("from") || "", placement: where, label });
      }
    }, { capture: true });

    renderNote(ph);
    new MutationObserver(() => renderNote(ph)).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  // One quiet line in the footer with an opt-out switch; the privacy page explains what is collected.
  function renderNote(ph) {
    const footer = document.querySelector("footer");
    if (!footer) return;
    let note = footer.querySelector(".analytics-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "analytics-note";
      note.style.cssText = "font-size:12px;opacity:.75;margin-top:8px";
      (footer.querySelector(".wrap, .container") || footer).appendChild(note);
    }
    const t = noteText();
    const optedOut = ph.has_opted_out_capturing();
    note.textContent = t.text + " ";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "analytics-toggle";
    toggle.style.cssText = "background:none;border:0;padding:0;color:inherit;font:inherit;text-decoration:underline;cursor:pointer";
    toggle.textContent = optedOut ? t.on : t.off;
    toggle.setAttribute("aria-pressed", String(optedOut));
    toggle.addEventListener("click", () => {
      if (ph.has_opted_out_capturing()) ph.opt_in_capturing();
      else ph.opt_out_capturing();
      renderNote(ph);
    });
    const policy = document.createElement("a");
    policy.href = "privacy.html#analytics";
    policy.textContent = t.policy;
    note.append(toggle, " · ", policy);
  }

  // Exposed for local testing with a stand-in client: maxRebateAnalytics.start(fake).
  window.maxRebateAnalytics = Object.freeze({ aiSource, cleanUrl, start });

  if (!LIVE_HOSTS.has(location.hostname)) return;

  // Official PostHog loader: queues calls until the library from the PostHog CDN has loaded.
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags on onFeatureFlags onSessionId identify setPersonProperties group resetGroups reset get_distinct_id get_session_id alias set_config opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  window.posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: "2026-08-30",
    person_profiles: "identified_only",
    disable_session_recording: true,
    capture_heatmaps: true,
    respect_dnt: true,
    opt_out_capturing_persistence_type: "cookie",
    before_send: (event) => {
      if (!event || !event.properties) return event;
      for (const key of ["$current_url", "$referrer", "$initial_current_url", "$initial_referrer"]) {
        if (key in event.properties) event.properties[key] = cleanUrl(event.properties[key]);
      }
      return event;
    },
    loaded: (ph) => start(ph)
  });
})();
