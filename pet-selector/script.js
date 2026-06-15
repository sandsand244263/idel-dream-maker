const petListEl = document.getElementById('pet-list');
let pets = [], selIdx = 0;

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

function render() {
  petListEl.innerHTML = '';
  if (!pets || pets.length === 0) {
    petListEl.innerHTML = '<div class="pet-empty">暂无宠物<br>将精灵图放入宠物文件夹</div>';
    return;
  }
  pets.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = 'pet-item' + (i === selIdx ? ' active' : '');
    item.textContent = p.name || ('宠物 ' + (i + 1));
    item.addEventListener('click', () => {
      window.petSelector.invoke('select-pet', { index: i }).catch(() => {});
      window.petSelector.invoke('close-selector').catch(() => {});
    });
    petListEl.appendChild(item);
  });
}

document.getElementById('btn-open-folder').addEventListener('click', () => {
  window.petSelector.invoke('open-pets-folder').catch(() => {});
});

document.getElementById('btn-back').addEventListener('click', () => {
  window.petSelector.invoke('close-selector').catch(() => {});
  window.petSelector.invoke('show-context-menu').catch(() => {});
});

window.petSelector.on('pet-list', (d) => {
  pets = d.pets || [];
  selIdx = d.selected || 0;
  render();
});

window.petSelector.invoke('get-initial-state').then((r) => {
  if (r) { pets = r.pets || []; selIdx = r.selected || 0; render(); }
}).catch(() => {});

window.petSelector.invoke('get-current-theme').then(r => { if (r) applyTheme(r.theme, r.customTheme); }).catch(() => {});
window.petSelector.on('theme-changed', (d) => { if (d) applyTheme(d.theme, d.customTheme); });
