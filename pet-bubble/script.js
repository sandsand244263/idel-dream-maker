const titleEl = document.getElementById('bubble-title');
const textEl = document.getElementById('bubble-text');

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

function restartAnim(el){el.style.animation='none';void el.offsetHeight;el.style.animation='';}
function update(data) {
  titleEl.textContent = data.title || '事件';
  titleEl.style.color = data.color || '#00BFFF';
  textEl.textContent = data.text || '';
  if (data.type === 'achievement') {
    document.getElementById('bubble').style.borderLeftColor = '#FFD700';
    titleEl.style.color = '#FFD700';
  } else if (data.type === 'levelup') {
    document.getElementById('bubble').style.borderLeftColor = '#00FF00';
    titleEl.style.color = '#00FF00';
  } else {
    document.getElementById('bubble').style.borderLeftColor = '#00BFFF';
    titleEl.style.color = '#00BFFF';
  }
  restartAnim(document.getElementById('bubble'));
}

window.petBubble.on('show-bubble', (d) => { update(d); });
window.petBubble.on('hide-bubble', () => { window.petBubble.invoke('close-bubble').catch(() => {}); });

document.getElementById('bubble').addEventListener('click', () => {
  window.petBubble.invoke('close-bubble').catch(() => {});
});

window.petBubble.invoke('get-current-theme').then(r => { if (r) applyTheme(r.theme, r.customTheme); }).catch(() => {});
window.petBubble.on('theme-changed', (d) => { if (d) applyTheme(d.theme, d.customTheme); });
