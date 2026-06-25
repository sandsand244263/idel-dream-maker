const LANG = { selectPet:'选择宠物', view:'视图', border:'显示边框', infobar:'信息栏', expbar:'进度条', chime:'整点报时', calculator:'计算器', screenshot:'截图', guide:'操作说明', hide:'隐藏宠物界面' };
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

let viewOpen = false;

function toggleView() {
  viewOpen = !viewOpen;
  const body = document.getElementById('ctx-fold-body');
  const arrow = document.querySelector('#ctx-fold-view .fold-arrow');
  body.classList.toggle('open', viewOpen);
  body.classList.toggle('closed', !viewOpen);
  if (arrow) arrow.classList.toggle('open', viewOpen);
}

function updateUI() {
  applyLanguage();
  ['border','infobar','expbar','chime'].forEach(k => {
    const el = document.getElementById('ctx-toggle-' + k);
    const def = k === 'chime' ? true : true;
    const key = k === 'chime' ? 'chime' : 'show' + k.charAt(0).toUpperCase() + k.slice(1);
    const on = getToggle(key, def);
    el.childNodes[0].textContent = on ? '\u2713 ' : '\u2717 ';
    el.className = 'ctx-item ctx-toggle ctx-sub' + (on ? ' ctx-on' : ' ctx-off');
  });
}

function initTools() {
  window.ctxMenu.invoke('get-available-tools').then(tools => {
    const calcEl = document.getElementById('ctx-calc');
    const ssEl = document.getElementById('ctx-screenshot');
    if (calcEl) calcEl.style.display = (tools || []).includes('calculator') ? '' : 'none';
    if (ssEl) ssEl.style.display = (tools || []).includes('screenshot') ? '' : 'none';
  }).catch(() => {});
}

document.getElementById('ctx-fold-view').addEventListener('click', () => { toggleView(); });

document.getElementById('ctx-calc').addEventListener('click', () => {
  window.ctxMenu.invoke('launch-system-tool', { tool: 'calculator' }).catch(() => {});
  window.ctxMenu.invoke('close-menu').catch(() => {});
});

document.getElementById('ctx-screenshot').addEventListener('click', () => {
  window.ctxMenu.invoke('launch-system-tool', { tool: 'screenshot' }).catch(() => {});
  window.ctxMenu.invoke('close-menu').catch(() => {});
});

document.getElementById('ctx-select-pet').addEventListener('click', () => {
  window.ctxMenu.invoke('show-pet-selector').catch(() => {});
  window.ctxMenu.invoke('close-menu').catch(() => {});
});

['border','infobar','expbar','chime'].forEach(k => {
  document.getElementById('ctx-toggle-' + k).addEventListener('click', () => {
    const key = k === 'chime' ? 'chime' : 'show' + k.charAt(0).toUpperCase() + k.slice(1);
    const val = !getToggle(key, true);
    setToggle(key, val);
    window.ctxMenu.invoke('toggle-pet-feature', { feature: k, value: val }).catch(() => {});
    updateUI();
  });
});

document.getElementById('ctx-guide').addEventListener('click', () => {
  window.ctxMenu.invoke('pet-guide').catch(() => {});
  window.ctxMenu.invoke('close-menu').catch(() => {});
});

document.getElementById('ctx-close').addEventListener('click', () => {
  window.ctxMenu.invoke('hide-pet-window').catch(() => {});
  window.ctxMenu.invoke('close-menu').catch(() => {});
});

window.ctxMenu.invoke('get-toggle-state').then(r => {
  if (r) {
    ['border','infobar','expbar','chime'].forEach(k => {
      const key = k === 'chime' ? 'chime' : 'show' + k.charAt(0).toUpperCase() + k.slice(1);
      if (r[key] !== undefined) setToggle(key, r[key]);
    });
  }
  updateUI();
  initTools();
  toggleView();
}).catch(() => { updateUI(); initTools(); toggleView(); });

document.addEventListener('click', (e) => {
  if (e.target === document.body) window.ctxMenu.invoke('close-menu').catch(() => {});
});

window.ctxMenu.invoke('get-current-theme').then(r => { if (r) applyTheme(r.theme, r.customTheme); }).catch(() => {});
window.ctxMenu.on('theme-changed', (d) => { if (d) applyTheme(d.theme, d.customTheme); });
