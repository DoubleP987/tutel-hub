// Apply an explicit preference before painting; first visits always use light.
(() => {
  let theme = 'light';

  try {
    if (localStorage.getItem('tutel-promo-theme') === 'dark') {
      theme = 'dark';
    }
  } catch {}

  document.documentElement.dataset.theme = theme;
})();
