/* Localized labels for the shared shell; all essential links also exist in HTML. */
(() => {
  const labels = {
    'zh-CN': ['返佣','代理','开户','提交申请','指南','联系'],
    'zh-TW': ['返佣','代理','開戶','提交申請','指南','聯絡'],
    en: ['Rebates','IB','Open account','Apply','Guides','Contact'],
    ms: ['Rebat','IB','Buka akaun','Mohon','Panduan','Hubungi'],
    th: ['รีเบต','IB','เปิดบัญชี','สมัคร','คู่มือ','ติดต่อ']
  };
  function update() {
    const lang = document.documentElement.lang;
    const words = labels[lang] || labels.en;
    const keys = ['rebates','ib','open','apply','guides','contact'];
    document.querySelectorAll('[data-mr-label]').forEach(link => {
      const key = link.dataset.mrLabel;
      link.textContent = words[keys.indexOf(key)];
      if (!link.classList.contains('referral')) {
        const url = new URL(link.getAttribute('href'), location.href);
        if (['apply','contact'].includes(key)) url.searchParams.set('lang', lang);
        if (key === 'open' && lang !== 'zh-CN') {
          url.pathname = url.pathname.replace(/[^/]*$/, 'tutorial-open.html');
          url.searchParams.set('lang', lang);
        }
        link.setAttribute('href', url.pathname.split('/').pop() + url.search + url.hash);
        if (url.pathname === location.pathname && !url.hash) link.setAttribute('aria-current', 'page');
      }
    });
  }
  update();
  document.getElementById('lang')?.addEventListener('change', update);
})();
