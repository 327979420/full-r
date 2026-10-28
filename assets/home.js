(() => {
  'use strict';

  const siteConfig = window.MAX_REBATE_CONFIG;
  if (!siteConfig) throw new Error('Missing MAX_REBATE_CONFIG');

  const T = window.MAX_REBATE_TRANSLATIONS;
  if (!T) throw new Error('Missing MAX_REBATE_TRANSLATIONS');
  const accountData = siteConfig.rebateAccounts;
  let currentLang='en';
  const langEl=document.getElementById('lang');
  const accountSelect=document.getElementById('accountSelect');
  const lotInput=document.getElementById('lotInput');
  const cashbackValue=document.getElementById('cashbackValue');
  const cashbackRule=document.getElementById('cashbackRule');
  const rateValue=document.getElementById('rateValue');
  const feeValue=document.getElementById('feeValue');
  const netFeeValue=document.getElementById('netFeeValue');

  function bindTablePointerEffects(){
    document.querySelectorAll('.rebate-table tbody td,.rebate-table tbody th').forEach((cell)=>{
      cell.addEventListener('pointermove',(e)=>{
        const r=cell.getBoundingClientRect();
        cell.style.setProperty('--mx',`${e.clientX-r.left}px`);
        cell.style.setProperty('--my',`${e.clientY-r.top}px`);
      });
    });
  }

  function money(v){return Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
  function renderAccountOptions(){if(!accountSelect)return;const keep=accountSelect.value||'STD';accountSelect.innerHTML=Object.keys(accountData).map(k=>`<option value="${k}">${T[currentLang].accounts[k]}</option>`).join('');accountSelect.value=accountData[keep]?keep:'STD'}
  function updateCalculator(){if(!accountSelect||!lotInput||!cashbackValue)return;const code=accountSelect.value||'STD',d=accountData[code],lots=Math.max(0,Number(lotInput.value)||0),min=d.min*lots,max=d.max*lots,rateText=d.min===d.max?'$'+d.min:'$'+d.min+'–'+d.max,lotWord=T[currentLang].lotWord;cashbackValue.innerHTML='<small>USD</small> '+(min===max?'$'+money(min):'$'+money(min)+'–$'+money(max));cashbackRule.textContent=`${code} · ${rateText} / ${lotWord} × ${lots} ${lotWord}`;rateValue.textContent=`${rateText} / ${lotWord}`;if(d.fee==null){feeValue.textContent='—';netFeeValue.textContent='—'}else{feeValue.textContent='$'+money(d.fee*lots);netFeeValue.textContent='$'+money((d.fee-d.max)*lots)+'–$'+money((d.fee-d.min)*lots)}}
  function setLang(lang){if(!T[lang])lang='en';currentLang=lang;try{localStorage.setItem('tmgm-lang',lang)}catch(e){}if(langEl)langEl.value=lang;document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;const value=T[lang][key];if(key==='heroTitle')el.innerHTML=value.replace('\n','<br>');else el.textContent=value});renderAccountOptions();updateCalculator()}

  // Each language has its own static page (built by scripts/build-locales.mjs). Choosing a
  // language opens that page; the Chinese homepage follows ?lang= links and a language the
  // visitor picked before.
  const LANG_PAGES={'zh-CN':'./','zh-TW':'zh-hant.html','en':'en.html','ms':'ms.html','th':'th.html'};
  const pageLang=document.documentElement.dataset.pageLang||'zh-CN';
  function readPicked(){try{return localStorage.getItem('tmgm-lang-picked')}catch(e){return null}}
  const wanted=new URLSearchParams(location.search).get('lang')||(pageLang==='zh-CN'?readPicked():null);
  if(wanted&&wanted!==pageLang&&LANG_PAGES[wanted]){location.replace(LANG_PAGES[wanted]+location.hash);return}

  bindTablePointerEffects();
  if(langEl)langEl.addEventListener('change',e=>{const lang=e.target.value;if(!LANG_PAGES[lang])return;try{localStorage.setItem('tmgm-lang-picked',lang)}catch(err){}location.href=LANG_PAGES[lang]+location.hash});
  if(accountSelect)accountSelect.addEventListener('change',updateCalculator);
  if(lotInput)lotInput.addEventListener('input',updateCalculator);
  setLang(pageLang);

  // Hide only an obstructing floating action; retain its geometry for the next check.
  // This also protects links reached by scrolling, not just keyboard focus.
  const floatingActions = [...document.querySelectorAll('.floating-open, .floating-contact, .mobilebar')];
  const protectedControls = [...document.querySelectorAll('.path-card a, #calculator .field')];
  let scheduled = false;
  function protectControls() {
    scheduled = false;
    const bounds = protectedControls.map(el => el.getBoundingClientRect());
    floatingActions.forEach(action => {
      const box = action.getBoundingClientRect();
      const overlaps = box.width > 0 && bounds.some(rect =>
        rect.width > 0 && rect.bottom > box.top - 8 && rect.top < box.bottom + 8 &&
        rect.right > box.left - 8 && rect.left < box.right + 8);
      const hasFocus = action.contains(document.activeElement);
      const chooserOpen = action.getAttribute('aria-expanded') === 'true';
      action.classList.toggle('home-obscured', overlaps && !hasFocus && !chooserOpen);
    });
  }
  function scheduleProtection() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(protectControls);
  }
  addEventListener('scroll', scheduleProtection, {passive: true});
  addEventListener('resize', scheduleProtection);
  document.addEventListener('focusin', scheduleProtection);
  document.addEventListener('focusout', scheduleProtection);
  document.getElementById('contact-widget')?.addEventListener('click', scheduleProtection);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleProtection);
    protectedControls.forEach(el => observer.observe(el));
  }
  scheduleProtection();
})();
