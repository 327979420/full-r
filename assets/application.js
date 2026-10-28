'use strict';

const siteConfig = window.MAX_REBATE_CONFIG;
if (!siteConfig) throw new Error('Missing MAX_REBATE_CONFIG');
const FORM_ENDPOINT = siteConfig.applicationEndpoint;
const T = {
  "zh-CN": {
    "brand": "满返网",
    "back": "返回首页",
    "title": "提交申请",
    "intro": "只填写处理返佣或 IB 合作真正需要的信息。",
    "rebateTitle": "申请返佣",
    "rebateDesc": "100%返还合资格返佣",
    "ibTitle": "申请 IB 合作",
    "ibDesc": "团队、社群与客户渠道合作",
    "platform": "平台",
    "email": "平台注册邮箱",
    "within": "账户是否在 3 天内注册？",
    "reachable": "是否能通过该注册邮箱接收通知？",
    "select": "请选择",
    "yes": "是",
    "no": "否",
    "note": "不要提交交易密码、验证码、银行卡资料或证件图片。申请结果和返佣资格以对应平台审核为准。",
    "consent": "同意满返网使用以上资料处理本次申请并联系申请人。",
    "submit": "提交申请",
    "submitting": "正在提交…",
    "mini": "提交后会生成申请编号，请保留编号用于后续查询。",
    "error": "尚未确认提交成功。可以重试，或提供下方编号联系满返网查询。",
    "choiceLabel": "选择申请类型",
    "withinHint": "从完成平台注册的那一刻起算。超过 3 天也可以提交，请选「否」。",
    "emailHint": "填写注册 TMGM 时使用的邮箱，核查结果会发送到此邮箱。",
    "reachableHint": "若选「否」，提交后请通过 Discord 或 Telegram 联系满返网，并提供申请编号。",
    "errorRef": "查询编号：",
    "errorContact": "联系满返网",
    "required": "请选择或填写此项。",
    "invalidEmail": "请填写完整的邮箱地址，例如 name@example.com。",
    "consentRequired": "请先同意资料用途后再提交。",
    "languageLabel": "选择语言",
    "footerAbout": "关于我们",
    "footerPrivacy": "隐私政策",
    "footerTerms": "使用条款",
    "footerRisk": "风险声明",
    "footerContact": "联系我们"
  },
  "zh-TW": {
    "brand": "滿返網",
    "back": "返回首頁",
    "title": "提交申請",
    "intro": "只填寫處理返佣或 IB 合作真正需要的資料。",
    "rebateTitle": "申請返佣",
    "rebateDesc": "100%返還合資格返佣",
    "ibTitle": "申請 IB 合作",
    "ibDesc": "團隊、社群與客戶渠道合作",
    "platform": "平台",
    "email": "平台註冊電郵",
    "within": "帳戶是否在 3 天內註冊？",
    "reachable": "是否能透過該註冊電郵接收通知？",
    "select": "請選擇",
    "yes": "是",
    "no": "否",
    "note": "不要提交交易密碼、驗證碼、銀行卡資料或證件圖片。申請結果和返佣資格以平台審核為準。",
    "consent": "同意滿返網使用以上資料處理本次申請並聯絡申請人。",
    "submit": "提交申請",
    "submitting": "正在提交…",
    "mini": "提交後會生成申請編號，請保留作後續查詢。",
    "error": "尚未確認提交成功。可以重試，或提供下方編號聯絡滿返網查詢。",
    "choiceLabel": "選擇申請類型",
    "withinHint": "從完成平台註冊的那一刻起算。超過 3 天也可以提交，請選「否」。",
    "emailHint": "填寫註冊 TMGM 時使用的電郵，核查結果會寄到此電郵。",
    "reachableHint": "若選「否」，提交後請透過 Discord 或 Telegram 聯絡滿返網，並提供申請編號。",
    "errorRef": "查詢編號：",
    "errorContact": "聯絡滿返網",
    "required": "請選擇或填寫此項。",
    "invalidEmail": "請填寫完整的電郵地址，例如 name@example.com。",
    "consentRequired": "請先同意資料用途後再提交。",
    "languageLabel": "選擇語言",
    "footerAbout": "關於我們",
    "footerPrivacy": "隱私政策",
    "footerTerms": "使用條款",
    "footerRisk": "風險聲明",
    "footerContact": "聯絡我們"
  },
  "en": {
    "brand": "Max Rebate",
    "back": "Back home",
    "title": "Submit an application",
    "intro": "Only provide the information needed to process your rebate or IB application.",
    "rebateTitle": "Rebate application",
    "rebateDesc": "100% of eligible rebate received is returned",
    "ibTitle": "IB partnership",
    "ibDesc": "Teams, communities and client channels",
    "platform": "Platform",
    "email": "Platform-registered email",
    "within": "Was the account registered within 3 days?",
    "reachable": "Can this registered email receive notifications?",
    "select": "Please select",
    "yes": "Yes",
    "no": "No",
    "note": "Do not submit trading passwords, verification codes, card details or identity-document images. Eligibility remains subject to platform review.",
    "consent": "Allow Max Rebate to use these details to process this application and contact the applicant.",
    "submit": "Submit application",
    "submitting": "Submitting…",
    "mini": "A reference will be generated after submission. Keep it for follow-up.",
    "error": "Submission could not be confirmed. Retry, or contact Max Rebate with the reference below to check.",
    "choiceLabel": "Choose application type",
    "withinHint": "Count from the moment platform registration was completed. More than 3 days ago? Select No; you can still submit.",
    "emailHint": "Use the email registered with TMGM. The review result will be sent to this address.",
    "reachableHint": "If No, contact Max Rebate via Discord or Telegram after submission and provide the application reference.",
    "errorRef": "Enquiry reference:",
    "errorContact": "Contact Max Rebate",
    "required": "Complete or select this field.",
    "invalidEmail": "Enter a complete email address, such as name@example.com.",
    "consentRequired": "Agree to the use of these details before submitting.",
    "languageLabel": "Choose language",
    "footerAbout": "About Us",
    "footerPrivacy": "Privacy Policy",
    "footerTerms": "Terms of Use",
    "footerRisk": "Risk Disclaimer",
    "footerContact": "Contact"
  },
  "ms": {
    "brand": "Max Rebate",
    "back": "Kembali",
    "title": "Hantar permohonan",
    "intro": "Berikan hanya maklumat yang diperlukan untuk memproses rebat atau permohonan IB.",
    "rebateTitle": "Permohonan rebat",
    "rebateDesc": "100% rebat layak yang diterima dikembalikan",
    "ibTitle": "Kerjasama IB",
    "ibDesc": "Pasukan, komuniti dan saluran pelanggan",
    "platform": "Platform",
    "email": "E-mel berdaftar platform",
    "within": "Akaun didaftarkan dalam 3 hari?",
    "reachable": "Bolehkah e-mel berdaftar ini menerima pemberitahuan?",
    "select": "Sila pilih",
    "yes": "Ya",
    "no": "Tidak",
    "note": "Jangan hantar kata laluan dagangan, kod pengesahan, butiran kad atau imej dokumen identiti.",
    "consent": "Benarkan Max Rebate menggunakan maklumat ini untuk memproses permohonan dan menghubungi pemohon.",
    "submit": "Hantar",
    "submitting": "Menghantar…",
    "mini": "Simpan nombor rujukan selepas penghantaran.",
    "error": "Penghantaran belum dapat disahkan. Cuba lagi atau hubungi Max Rebate dengan rujukan di bawah untuk semakan.",
    "choiceLabel": "Pilih jenis permohonan",
    "withinHint": "Kira dari saat pendaftaran platform selesai. Lebih daripada 3 hari? Pilih Tidak; permohonan masih boleh dihantar.",
    "emailHint": "Gunakan e-mel yang didaftarkan dengan TMGM. Keputusan semakan akan dihantar ke alamat ini.",
    "reachableHint": "Jika Tidak, hubungi Max Rebate melalui Discord atau Telegram selepas penghantaran dan berikan nombor rujukan.",
    "errorRef": "Rujukan pertanyaan:",
    "errorContact": "Hubungi Max Rebate",
    "required": "Lengkapkan atau pilih medan ini.",
    "invalidEmail": "Masukkan alamat e-mel lengkap, seperti name@example.com.",
    "consentRequired": "Setujui penggunaan maklumat ini sebelum menghantar.",
    "languageLabel": "Pilih bahasa",
    "footerAbout": "Tentang Max Rebate",
    "footerPrivacy": "Dasar Privasi",
    "footerTerms": "Syarat Penggunaan",
    "footerRisk": "Penafian Risiko",
    "footerContact": "Hubungi"
  },
  "th": {
    "brand": "Max Rebate",
    "back": "กลับหน้าแรก",
    "title": "ส่งใบสมัคร",
    "intro": "กรอกเฉพาะข้อมูลที่จำเป็นต่อการดำเนินการรีเบตหรือ IB",
    "rebateTitle": "สมัครรีเบต",
    "rebateDesc": "คืนรีเบตที่มีสิทธิ์ซึ่ง Max Rebate ได้รับ 100%",
    "ibTitle": "ความร่วมมือ IB",
    "ibDesc": "ทีม ชุมชน และช่องทางลูกค้า",
    "platform": "แพลตฟอร์ม",
    "email": "อีเมลที่ลงทะเบียน",
    "within": "บัญชีลงทะเบียนภายใน 3 วันหรือไม่?",
    "reachable": "อีเมลที่ลงทะเบียนนี้รับการแจ้งเตือนได้หรือไม่?",
    "select": "โปรดเลือก",
    "yes": "ใช่",
    "no": "ไม่",
    "note": "ห้ามส่งรหัสผ่านเทรด รหัสยืนยัน ข้อมูลบัตร หรือภาพเอกสารยืนยันตัวตน",
    "consent": "ยินยอมให้ Max Rebate ใช้ข้อมูลนี้เพื่อดำเนินการใบสมัครและติดต่อผู้สมัคร",
    "submit": "ส่งใบสมัคร",
    "submitting": "กำลังส่ง…",
    "mini": "โปรดเก็บหมายเลขอ้างอิงไว้เพื่อติดตามผล",
    "error": "ยังยืนยันการส่งไม่สำเร็จ ลองอีกครั้งหรือติดต่อ Max Rebate พร้อมหมายเลขอ้างอิงด้านล่างเพื่อตรวจสอบ",
    "choiceLabel": "เลือกประเภทใบสมัคร",
    "withinHint": "นับจากเวลาที่ลงทะเบียนกับแพลตฟอร์มเสร็จ หากเกิน 3 วัน ให้เลือกไม่ใช่และยังส่งใบสมัครได้",
    "emailHint": "ใช้อีเมลที่ลงทะเบียนกับ TMGM ผลการตรวจสอบจะส่งไปยังอีเมลนี้",
    "reachableHint": "หากเลือกไม่ใช่ ให้ติดต่อ Max Rebate ผ่าน Discord หรือ Telegram หลังส่งใบสมัคร พร้อมแจ้งหมายเลขอ้างอิง",
    "errorRef": "หมายเลขอ้างอิงสำหรับสอบถาม:",
    "errorContact": "ติดต่อ Max Rebate",
    "required": "กรอกหรือเลือกช่องนี้",
    "invalidEmail": "กรอกอีเมลให้ครบถ้วน เช่น name@example.com",
    "consentRequired": "โปรดยินยอมให้ใช้ข้อมูลก่อนส่งใบสมัคร",
    "languageLabel": "เลือกภาษา",
    "footerAbout": "เกี่ยวกับ Max Rebate",
    "footerPrivacy": "นโยบายความเป็นส่วนตัว",
    "footerTerms": "ข้อกำหนดการใช้งาน",
    "footerRisk": "คำชี้แจงความเสี่ยง",
    "footerContact": "ติดต่อ"
  }
};

const get = id => document.getElementById(id);
const form = get('appForm');
const language = get('lang');
const submit = get('submitBtn');
const result = get('result');
const params = new URLSearchParams(location.search);
const homePages = {'zh-CN': 'index.html', 'zh-TW': 'zh-hant.html', en: 'en.html', ms: 'ms.html', th: 'th.html'};
let pending = false;
let applicationId;
const textTargets = {
  brand: 'brand', back: 'back', title: 'title', intro: 'intro',
  rebateTitle: 'rebateTitle', rebateDesc: 'rebateDesc', ibTitle: 'ibTitle', ibDesc: 'ibDesc',
  platformLabel: 'platform', emailLabel: 'email', withinLabel: 'within', reachableLabel: 'reachable',
  selectOne: 'select', selectTwo: 'select', yesOpt: 'yes', yesOpt2: 'yes', noOpt: 'no', noOpt2: 'no',
  privacyNote: 'note', consent: 'consent', mini: 'mini', choiceLabel: 'choiceLabel',
  withinHint: 'withinHint', emailHint: 'emailHint', reachableHint: 'reachableHint',
  footerAbout: 'footerAbout', footerPrivacy: 'footerPrivacy', footerTerms: 'footerTerms', footerRisk: 'footerRisk', footerContact: 'footerContact',
  errorMessage: 'error', errorRef: 'errorRef', errorContact: 'errorContact'
};
function validateField(control) {
  const t = T[document.documentElement.lang];
  const errorId = control.name === 'application_type' ? 'applicationTypeError' : control.id === 'consentInput' ? 'consentError' : control.id + 'Error';
  const error = get(errorId);
  if (!error) return;
  const valid = control.validity.valid;
  control.setAttribute('aria-invalid', String(!valid));
  error.hidden = valid;
  error.textContent = valid ? '' : control.type === 'checkbox' ? t.consentRequired : control.validity.typeMismatch ? t.invalidEmail : t.required;
}
function setLang(locale) {
  if (!Object.hasOwn(T, locale)) locale = 'en';
  try { localStorage.setItem('tmgm-lang', locale); } catch (_) {}
  document.documentElement.lang = locale;
  language.value = locale;
  const t = T[locale];
  Object.entries(textTargets).forEach(([id, key]) => { get(id).textContent = t[key]; });
  language.setAttribute('aria-label', t.languageLabel);
  submit.textContent = pending ? t.submitting : t.submit;
  document.title = t.title + ' | ' + t.brand;
  get('back').href = get('brand').href = homePages[locale];
  get('errorContact').href = homePages[locale] + '#contact';
  form.querySelectorAll('[aria-invalid="true"]').forEach(validateField);
}
language.addEventListener('change', event => setLang(event.target.value));
let saved;
try { saved = localStorage.getItem('tmgm-lang'); } catch (_) {}
setLang(params.get('lang') || saved || 'zh-CN');
// Preserve entry-point preselection. Visitors can still correct both answers.
if (params.get('new') === '1') {
  form.querySelector('input[name="application_type"][value="REBATE"]').checked = true;
  form.elements.registered_within_3_days.value = 'yes';
}
form.addEventListener('invalid', event => validateField(event.target), true);
form.addEventListener('input', event => {
  if (event.target.name === 'application_type') {
    form.querySelectorAll('[name="application_type"]').forEach(validateField);
  } else if (event.target.hasAttribute('aria-invalid')) validateField(event.target);
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending || !form.reportValidity()) return;
  const locale = document.documentElement.lang;
  const t = T[locale];
  const data = Object.fromEntries(new FormData(form).entries());
  const kind = data.application_type || 'APP';
  // Reuse the reference on retries, so an uncertain network response can be traced.
  if (!applicationId || !applicationId.startsWith(kind + '-')) {
    applicationId = kind + '-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  }
  const id = applicationId;
  data.application_id = id;
  data.site_language = locale;
  data.submitted_at = new Date().toISOString();
  data.email = data.registered_email;
  data._replyto = data.registered_email;
  data._subject = 'Max Rebate application ' + id;
  data._template = 'table';
  data._captcha = 'false';
  data._url = window.location.href;
  data.source_page = params.get('from') || '';
  try { localStorage.setItem('last-' + kind, JSON.stringify({id, data, time: data.submitted_at})); } catch (_) {}
  pending = true;
  result.hidden = true;
  submit.disabled = language.disabled = true;
  form.setAttribute('aria-busy', 'true');
  submit.textContent = t.submitting;
  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify(data)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false || payload.success === 'false') throw new Error('submit failed');
    try { sessionStorage.setItem('lastApplication', JSON.stringify({id, type: kind, lang: locale})); } catch (_) {}
    window.location.href = 'success.html?ref=' + encodeURIComponent(id) + '&type=' + encodeURIComponent(kind) + '&lang=' + encodeURIComponent(locale);
  } catch (_) {
    get('failedRef').textContent = id;
    result.hidden = false;
    result.focus();
  } finally {
    pending = false;
    submit.disabled = language.disabled = false;
    submit.textContent = T[document.documentElement.lang].submit;
    form.removeAttribute('aria-busy');
  }
});
