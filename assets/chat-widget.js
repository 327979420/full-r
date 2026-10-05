(() => {
  'use strict';

  // Support assistant, served by the Worker in chat-worker/ on /api/chat. The widget only appears
  // when GET /api/chat/status says it is enabled (CHAT_ENABLED in chat-worker/wrangler.toml), so
  // nothing shows before the Worker is deployed. Add ?chat=on to a URL to preview it in that tab
  // while CHAT_ENABLED is still "false".
  const ENDPOINT = '/api/chat';
  const config = window.MAX_REBATE_CONFIG || {};
  let preview = false;
  try {
    if (new URLSearchParams(location.search).get('chat') === 'on') sessionStorage.setItem('mr-chat-preview', '1');
    preview = sessionStorage.getItem('mr-chat-preview') === '1';
  } catch (e) { /* storage blocked: no preview */ }

  const TEXT = {
    'zh-CN': {
      team: '满返网客服', sent: '已发送给客服，回复会显示在这里。',
      open: '在线咨询', title: 'Max Rebate 助手', menu: 'AI 在线问答', menuSub: '即时回答返佣问题', close: '关闭',
      greeting: '你好！我是 Max Rebate 的 AI 助手，可以解答 TMGM 返佣标准、账户类型和申请流程等问题。',
      placeholder: '输入你的问题…', send: '发送', thinking: '正在回复…',
      human: '需要人工协助？直接联系我们：',
      error: '助手暂时无法回复，请通过 Telegram 或 Discord 联系我们。',
      limited: '发送太频繁，请一分钟后再试。',
      note: 'AI 回答仅供参考，不构成投资建议；请勿发送密码、验证码或证件。对话由 AI 服务处理；需要人工的对话会转给我们的客服，无法回答的问题会以匿名主题记录，用于完善网站。',
      suggestions: ['TMGM 黄金返佣多少？', '返佣多久到账？', '已有 TMGM 账户能申请吗？']
    },
    'zh-TW': {
      team: '滿返網客服', sent: '已發送給客服，回覆會顯示在這裡。',
      open: '線上諮詢', title: 'Max Rebate 助手', menu: 'AI 線上問答', menuSub: '即時回答返佣問題', close: '關閉',
      greeting: '你好！我是 Max Rebate 的 AI 助手，可以解答 TMGM 返佣標準、帳戶類型和申請流程等問題。',
      placeholder: '輸入你的問題…', send: '發送', thinking: '正在回覆…',
      human: '需要真人協助？直接聯絡我們：',
      error: '助手暫時無法回覆，請透過 Telegram 或 Discord 聯絡我們。',
      limited: '發送太頻繁，請一分鐘後再試。',
      note: 'AI 回答僅供參考，不構成投資建議；請勿發送密碼、驗證碼或證件。對話由 AI 服務處理；需要真人的對話會轉給我們的客服，無法回答的問題會以匿名主題記錄，用於完善網站。',
      suggestions: ['TMGM 黃金返佣多少？', '返佣多久到帳？', '已有 TMGM 帳戶能申請嗎？']
    },
    en: {
      team: 'Max Rebate team', sent: 'Sent to our team. Their reply will appear here.',
      open: 'Ask us', title: 'Max Rebate assistant', menu: 'Ask the AI assistant', menuSub: 'Instant answers about rebates', close: 'Close',
      greeting: "Hi! I'm Max Rebate's AI assistant. Ask me about TMGM rebate rates, account types or how to apply.",
      placeholder: 'Type your question…', send: 'Send', thinking: 'Typing…',
      human: 'Need a person? Contact us directly:',
      error: "The assistant can't reply right now. Please contact us on Telegram or Discord.",
      limited: 'Too many messages. Please try again in a minute.',
      note: "AI answers are for information only, not investment advice. Never send passwords, codes or ID documents. Chats are processed by an AI service; chats that need a person go to our team, and questions it can't answer are logged as anonymous topics to improve the site.",
      suggestions: ['How much is the TMGM gold rebate?', 'When is the rebate credited?', 'Can an existing TMGM account apply?']
    },
    ms: {
      team: 'Pasukan Max Rebate', sent: 'Dihantar kepada pasukan kami. Balasan akan muncul di sini.',
      open: 'Tanya kami', title: 'Pembantu Max Rebate', menu: 'Tanya pembantu AI', menuSub: 'Jawapan segera tentang rebat', close: 'Tutup',
      greeting: 'Hai! Saya pembantu AI Max Rebate. Tanya saya tentang kadar rebat TMGM, jenis akaun atau cara memohon.',
      placeholder: 'Taip soalan anda…', send: 'Hantar', thinking: 'Sedang menaip…',
      human: 'Perlukan bantuan manusia? Hubungi kami terus:',
      error: 'Pembantu tidak dapat membalas sekarang. Sila hubungi kami melalui Telegram atau Discord.',
      limited: 'Terlalu banyak mesej. Sila cuba lagi dalam seminit.',
      note: 'Jawapan AI untuk maklumat sahaja, bukan nasihat pelaburan. Jangan hantar kata laluan, kod atau dokumen pengenalan. Perbualan diproses oleh perkhidmatan AI; perbualan yang memerlukan manusia dihantar kepada pasukan kami, dan soalan yang tidak dapat dijawab direkod sebagai topik tanpa nama untuk menambah baik laman ini.',
      suggestions: ['Berapakah rebat emas TMGM?', 'Bilakah rebat dikreditkan?', 'Bolehkah akaun TMGM sedia ada memohon?']
    },
    th: {
      team: 'ทีม Max Rebate', sent: 'ส่งถึงทีมของเราแล้ว คำตอบจะแสดงที่นี่',
      open: 'สอบถาม', title: 'ผู้ช่วย Max Rebate', menu: 'ถามผู้ช่วย AI', menuSub: 'ตอบคำถามเรื่องรีเบตทันที', close: 'ปิด',
      greeting: 'สวัสดี! ฉันคือผู้ช่วย AI ของ Max Rebate ถามเรื่องอัตรารีเบต TMGM ประเภทบัญชี หรือวิธีสมัครได้เลย',
      placeholder: 'พิมพ์คำถามของคุณ…', send: 'ส่ง', thinking: 'กำลังพิมพ์…',
      human: 'ต้องการคุยกับเจ้าหน้าที่? ติดต่อเราได้โดยตรง:',
      error: 'ผู้ช่วยยังตอบไม่ได้ในขณะนี้ โปรดติดต่อเราทาง Telegram หรือ Discord',
      limited: 'ส่งข้อความถี่เกินไป โปรดลองใหม่ในอีกหนึ่งนาที',
      note: 'คำตอบจาก AI ใช้เพื่อเป็นข้อมูลเท่านั้น ไม่ใช่คำแนะนำการลงทุน ห้ามส่งรหัสผ่าน รหัสยืนยัน หรือเอกสารยืนยันตัวตน แชตจะถูกประมวลผลโดยบริการ AI แชตที่ต้องใช้เจ้าหน้าที่จะส่งต่อให้ทีมของเรา และคำถามที่ตอบไม่ได้จะถูกบันทึกเป็นหัวข้อแบบไม่ระบุตัวตนเพื่อปรับปรุงเว็บไซต์',
      suggestions: ['รีเบตทองคำ TMGM เท่าไร?', 'รีเบตเข้าบัญชีเมื่อไร?', 'บัญชี TMGM เดิมสมัครได้ไหม?']
    }
  };

  const pageLang = document.documentElement.dataset.pageLang || document.documentElement.lang || 'zh-CN';
  const lang = /^zh-(tw|hant|hk)/i.test(pageLang) ? 'zh-TW' : /^zh/i.test(pageLang) ? 'zh-CN' : TEXT[pageLang.slice(0, 2)] ? pageLang.slice(0, 2) : 'zh-CN';
  const t = TEXT[lang];
  const STORE = 'mr-chat-log';
  const MAX_SENT = 12;
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // history items: {role: 'user' | 'assistant' | 'team', content}. 'team' = a reply from a person.
  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch (e) { history = []; }
  if (!Array.isArray(history)) history = [];
  function save() { try { sessionStorage.setItem(STORE, JSON.stringify(history.slice(-20))); } catch (e) { /* not persisted */ } }

  // One id per browser tab, so a team member's Telegram reply reaches this conversation.
  let conversation = '';
  try { conversation = sessionStorage.getItem('mr-chat-id') || ''; } catch (e) { /* new id below */ }
  if (!/^[a-z0-9]{12,32}$/.test(conversation)) {
    conversation = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    try { sessionStorage.setItem('mr-chat-id', conversation); } catch (e) { /* id lasts for this page */ }
  }
  // After a handoff, check for team replies every few seconds for 30 minutes (extended by activity).
  const POLL_MS = 8000;
  const WAIT_MS = 30 * 60 * 1000;
  let poll = { after: 0, until: 0 };
  try { poll = Object.assign(poll, JSON.parse(sessionStorage.getItem('mr-chat-poll') || '{}')); } catch (e) { /* defaults */ }
  function savePoll() { try { sessionStorage.setItem('mr-chat-poll', JSON.stringify(poll)); } catch (e) { /* not persisted */ } }

  const panel = document.createElement('section');
  panel.className = 'mr-chat-panel';
  panel.id = 'mr-chat-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'mr-chat-title');
  panel.innerHTML =
    `<div class="mr-chat-head"><h2 id="mr-chat-title">${escapeHtml(t.title)} <span class="mr-chat-badge">AI</span></h2>` +
    `<button type="button" class="mr-chat-close" aria-label="${escapeHtml(t.close)}">×</button></div>` +
    '<div class="mr-chat-log" role="log" aria-live="polite"></div>' +
    `<div class="mr-chat-suggest">${t.suggestions.map((s) => `<button type="button">${escapeHtml(s)}</button>`).join('')}</div>` +
    `<div class="mr-chat-human" hidden><span>${escapeHtml(t.human)}</span>` +
    '<a data-contact="telegram"><img src="assets/icons/telegram.svg" width="20" height="20" alt="">Telegram</a>' +
    '<a data-contact="discord"><img src="assets/icons/discord.svg" width="20" height="20" alt="">Discord</a></div>' +
    `<form class="mr-chat-form"><textarea rows="1" maxlength="1000" aria-label="${escapeHtml(t.placeholder)}" placeholder="${escapeHtml(t.placeholder)}"></textarea>` +
    `<button type="submit">${escapeHtml(t.send)}</button></form>` +
    `<p class="mr-chat-note">${escapeHtml(t.note)}</p>`;

  const log = panel.querySelector('.mr-chat-log');
  const suggest = panel.querySelector('.mr-chat-suggest');
  const human = panel.querySelector('.mr-chat-human');
  const form = panel.querySelector('.mr-chat-form');
  const input = form.querySelector('textarea');
  const sendButton = form.querySelector('button');
  panel.querySelectorAll('[data-contact]').forEach((link) => {
    const href = config.contacts && config.contacts[link.dataset.contact];
    if (!href) return link.remove();
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
  });

  function bubble(role, text) {
    const p = document.createElement('p');
    p.className = `mr-chat-msg mr-chat-msg--${role}`;
    p.innerHTML = (role === 'team' ? `<strong class="mr-chat-who">${escapeHtml(t.team)}</strong>` : '') +
      escapeHtml(text).replace(/https:\/\/max-rebate\.com\/[\w./#-]*/g, (url) => `<a href="${url}">${url}</a>`);
    log.append(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }

  function renderHistory() {
    log.textContent = '';
    bubble('assistant', t.greeting);
    history.forEach((m) => bubble(m.role, m.content));
    suggest.hidden = history.length > 0;
  }

  let returnFocus = null;
  let launcher = null;
  function openPanel(from, focusInput = true) {
    returnFocus = from;
    if (!log.childElementCount) renderHistory();
    panel.hidden = false;
    log.scrollTop = log.scrollHeight;
    if (launcher) launcher.setAttribute('aria-expanded', 'true');
    if (focusInput) input.focus();
  }
  function closePanel() {
    panel.hidden = true;
    if (launcher) launcher.setAttribute('aria-expanded', 'false');
    if (returnFocus) returnFocus.focus();
  }

  let busy = false;
  async function send(raw) {
    const text = raw.trim().slice(0, 1000);
    if (!text || busy) return;
    busy = true;
    sendButton.disabled = true;
    suggest.hidden = true;
    history.push({ role: 'user', content: text });
    save();
    bubble('user', text);
    input.value = '';
    resize();
    const typing = bubble('assistant', t.thinking);
    typing.classList.add('mr-chat-typing');
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-MAX_SENT).map((m) => (m.role === 'team' ? { role: 'assistant', content: `[Max Rebate team] ${m.content}` } : m)),
          lang,
          page: location.pathname,
          conversation
        })
      });
      typing.remove();
      if (response.ok) {
        const data = await response.json();
        if (data.forwarded) {
          bubble('status', t.sent);
        } else {
          history.push({ role: 'assistant', content: data.reply });
          save();
          bubble('assistant', data.reply);
        }
        if (data.needs_human) {
          human.hidden = false;
          waitForTeam();
        }
      } else {
        bubble('notice', response.status === 429 ? t.limited : t.error);
        if (response.status !== 429) human.hidden = false;
      }
    } catch (e) {
      typing.remove();
      bubble('notice', t.error);
      human.hidden = false;
    } finally {
      busy = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  let pollTimer = null;
  function waitForTeam() {
    poll.until = Date.now() + WAIT_MS;
    savePoll();
    if (!pollTimer) pollTimer = setTimeout(checkInbox, POLL_MS);
  }
  async function checkInbox() {
    pollTimer = null;
    if (Date.now() > poll.until) return;
    if (document.visibilityState === 'visible') {
      try {
        const response = await fetch(`${ENDPOINT}/inbox?c=${conversation}&after=${poll.after}`);
        const data = response.ok ? await response.json() : { messages: [] };
        for (const m of data.messages) {
          poll.after = Math.max(poll.after, m.n);
          history.push({ role: 'team', content: m.text });
          if (log.childElementCount) bubble('team', m.text);
        }
        if (data.messages.length) {
          save();
          poll.until = Date.now() + WAIT_MS;
          savePoll();
          if (panel.hidden) openPanel(null, false);
        }
      } catch (e) { /* offline: try again next time */ }
    }
    pollTimer = setTimeout(checkInbox, POLL_MS);
  }

  function resize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    send(input.value);
  });
  input.addEventListener('input', resize);
  input.addEventListener('keydown', (event) => {
    // Enter sends; Shift+Enter adds a line. Ignore Enter while an IME (Chinese, Thai…) is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      send(input.value);
    }
  });
  suggest.addEventListener('click', (event) => {
    if (event.target.closest('button')) send(event.target.closest('button').textContent);
  });
  panel.querySelector('.mr-chat-close').addEventListener('click', closePanel);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanel();
  });

  function mount() {
    document.body.append(panel);
    if (poll.until > Date.now()) pollTimer = setTimeout(checkInbox, 1000);
    // Checks pause while the tab is hidden; look again as soon as the visitor comes back.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !pollTimer || poll.until < Date.now()) return;
      clearTimeout(pollTimer);
      pollTimer = setTimeout(checkInbox, 0);
    });
    const chooser = document.getElementById('contact-chooser');
    const contactToggle = document.getElementById('contact-toggle');
    if (chooser && contactToggle) {
      // The homepage already has a floating contact button: offer the assistant inside its menu.
      const option = document.createElement('a');
      option.className = 'contact-option';
      option.href = '#mr-chat-panel';
      option.setAttribute('role', 'button');
      option.innerHTML =
        `<span class="mr-chat-option-icon" aria-hidden="true">AI</span><span><strong>${escapeHtml(t.menu)}</strong>` +
        `<small>${escapeHtml(t.menuSub)}</small></span><span aria-hidden="true">→</span>`;
      chooser.querySelector('.contact-option').before(option);
      option.addEventListener('click', (event) => {
        event.preventDefault();
        chooser.hidden = true;
        contactToggle.setAttribute('aria-expanded', 'false');
        openPanel(contactToggle);
      });
      return;
    }
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'mr-chat-launcher';
    if (document.querySelector('.mobilebar')) launcher.classList.add('mr-chat--above-bar');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'mr-chat-panel');
    launcher.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
      '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l-3 2v-9.5A9.5 9.5 0 0 1 11.5 3h1a8.5 8.5 0 0 1 8.5 8.5Z"/><path d="M7 10h10M7 14h6"/></svg>' +
      `<span>${escapeHtml(t.open)}</span>`;
    launcher.addEventListener('click', () => (panel.hidden ? openPanel(launcher) : closePanel()));
    document.body.append(launcher);
  }

  // Ask the Worker whether chat is on, then load the stylesheet (same ?v= as this script) and show
  // the widget once it has loaded, so nothing flashes unstyled.
  const script = document.currentScript;
  fetch(`${ENDPOINT}/status`)
    .then((response) => (response.ok ? response.json() : null))
    .then((status) => {
      if (!status || (!status.enabled && !preview)) return;
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = script ? script.src.replace(/chat-widget\.js/, 'chat-widget.css') : 'assets/chat-widget.css';
      stylesheet.addEventListener('load', mount, { once: true });
      document.head.append(stylesheet);
    })
    .catch(() => { /* Worker not deployed or offline: no widget */ });
})();
