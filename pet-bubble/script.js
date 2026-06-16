const LANG = {
  zh: { event: '事件' },
  en: { event: 'Event' },
};
let currentLang = 'zh';

function t(key) { return (LANG[currentLang] && LANG[currentLang][key]) || LANG.zh[key] || key; }

function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
}

window.bubble.on('show-bubble', (data) => {
  if (!data) return;
  applyLanguage();
  const titleEl = document.getElementById('bubble-title');
  const textEl = document.getElementById('bubble-text');
  if (data.title) titleEl.textContent = data.title;
  textEl.textContent = data.text || '';
  document.getElementById('bubble').style.display = 'block';
});

window.bubble.invoke('get-current-theme').then(r => {
  if (r) {
    document.body.className = r.theme && r.theme !== 'green' ? 'theme-' + r.theme : '';
    if (r.customTheme) {
      document.body.style.setProperty('--fg', r.customTheme.fg);
      document.body.style.setProperty('--bg', r.customTheme.bg);
      document.body.style.setProperty('--dim', r.customTheme.dim);
      document.body.style.setProperty('--border', r.customTheme.border || r.customTheme.dim);
    }
  }
}).catch(() => {});
window.bubble.on('theme-changed', (d) => {
  if (d) {
    document.body.className = d.theme && d.theme !== 'green' ? 'theme-' + d.theme : '';
    if (d.customTheme) {
      document.body.style.setProperty('--fg', d.customTheme.fg);
      document.body.style.setProperty('--bg', d.customTheme.bg);
      document.body.style.setProperty('--dim', d.customTheme.dim);
      document.body.style.setProperty('--border', d.customTheme.border || d.customTheme.dim);
    }
  }
});
window.bubble.on('language-changed', (d) => { if (d && d.lang) { currentLang = d.lang; applyLanguage(); } });
