(() => {
  "use strict";

  window.MAX_REBATE_CONFIG = Object.freeze({
    referralUrl: "https://portal.tminvgain.com/register?sales=NjAwM19GcmVkZHlMaWFuZw==&language=zh-Hans",
    applicationEndpoint: "https://formsubmit.co/ajax/f774839241@gmail.com",
    contacts: Object.freeze({
      discord: "https://discord.gg/7zYmxR42KY",
      telegram: "https://t.me/LiangFreddy"
    }),
    rebateAccounts: Object.freeze({
      STD: Object.freeze({ min: 20, max: 20, fee: null }),
      PM: Object.freeze({ min: 15, max: 15, fee: null }),
      DC: Object.freeze({ min: 10, max: 10, fee: null }),
      PRO: Object.freeze({ min: 10, max: 10, fee: null }),
      RAW07: Object.freeze({ min: 2, max: 3.5, fee: 5 })
    })
  });
})();
