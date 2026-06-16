const LANG = { selectPet:'选择宠物', border:'显示边框', infobar:'信息栏', expbar:'进度条', hide:'隐藏' };
function t(key) { return LANG[key] || key; }

function setToggle(key, val) { localStorage.setItem('pet_' + key, val); }
function getToggle(key, def) { const v = localStorage.getItem('pet_' + key); return v !== null ? v === 'true' : def; }

function applyTheme(theme, customTheme) {
  document.body.className = '';
  if (customTheme) {
    document.body.style.setProperty('--fg', customTheme.fg);
    document.body.style.setProperty('--bg', customTheme.bg);
    document.body.style.setProperty('--dim', customTheme.dim);
    document.body.style.setProperty('--border', customTheme.border || customTheme.dim);
  } else if (theme && theme !== 'green') {
    document.body.classList.add('theme-' + theme);
  }
}

function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
}

function updateUI() {
  applyLanguage();
  ['border','infobar','expbar'].forEach(k => {
    const el = document.getElementById('ctx-toggle-' + k);
    const on = getToggle('show' + k.charAt(0).toUpperCase() + k.slice(1), true);
    el.childNodes[0].textContent = on ? '\u2713 ' : '\u2717 ';
    el.className = 'ctx-item ctx-toggle' + (on ? ' ctx-on' : ' ctx-off');
  });
}

document.getElementById('ctx-select-pet').addEventListener('click', () => {
  window.ctxMenu.invoke('show-pet-selector').catch(() => {});
  window.ctxMenu.invoke('close-menu').catch(() => {});
});

['border','infobar','expbar'].forEach(k => {
  document.getElementById('ctx-toggle-' + k).addEventListener('click', () => {
    const key = 'show' + k.charAt(0).toUpperCase() + k.slice(1);
    const val = !getToggle(key, true);
    setToggle(key, val);
    window.ctxMenu.invoke('toggle-pet-feature', { feature: k, value: val }).catch(() => {});
    updateUI();
  });
});

document.getElementById('ctx-close').addEventListener('click', () => {
  window.ctxMenu.invoke('hide-pet-window').catch(() => {});
  window.ctxMenu.invoke('close-menu').catch(() => {});
});

window.ctxMenu.invoke('get-toggle-state').then(r => {
  if (r) {
    ['border','infobar','expbar'].forEach(k => {
      const key = 'show' + k.charAt(0).toUpperCase() + k.slice(1);
      if (r[key] !== undefined) setToggle(key, r[key]);
    });
  }
  updateUI();
}).catch(() => { updateUI(); });

document.addEventListener('click', (e) => {
  if (e.target === document.body) window.ctxMenu.invoke('close-menu').catch(() => {});
});

window.ctxMenu.invoke('get-current-theme').then(r => { if (r) applyTheme(r.theme, r.customTheme); }).catch(() => {});
window.ctxMenu.on('theme-changed', (d) => { if (d) applyTheme(d.theme, d.customTheme); });
