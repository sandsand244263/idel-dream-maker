window.petBubble.on('show-bubble', (data) => {
  if (!data) return;
  const titleEl = document.getElementById('bubble-title');
  const textEl = document.getElementById('bubble-text');
  if (data.title) titleEl.textContent = data.title;
  textEl.textContent = data.text || '';
  document.body.dataset.type = data.type || 'event';
  document.getElementById('bubble').style.display = 'block';
});

document.getElementById('bubble').addEventListener('click', () => {
  // chime 类型由 pet.js 自动关闭，点击不主动关闭
  if (document.body.dataset.type === 'chime') return;
  window.petBubble.invoke('close-bubble').catch(() => {});
});

window.petBubble.invoke('get-current-theme').then(r => {
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
window.petBubble.on('theme-changed', (d) => {
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
