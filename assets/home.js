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
  function setLang(lang){if(!T[lang])lang='en';currentLang=lang;localStorage.setItem('tmgm-lang',lang);document.documentElement.lang=lang;if(langEl)langEl.value=lang;document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;const value=T[lang][key];if(key==='heroTitle')el.innerHTML=value.replace('\n','<br>');else el.textContent=value});renderAccountOptions();updateCalculator()}

  bindTablePointerEffects();
  if(langEl)langEl.addEventListener('change',e=>setLang(e.target.value));
  if(accountSelect)accountSelect.addEventListener('change',updateCalculator);
  if(lotInput)lotInput.addEventListener('input',updateCalculator);
  const saved=localStorage.getItem('tmgm-lang');
  setLang(new URLSearchParams(location.search).get('lang')||saved||'zh-CN');
})();
