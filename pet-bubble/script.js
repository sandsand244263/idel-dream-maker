const titleEl = document.getElementById('bubble-title');
const textEl = document.getElementById('bubble-text');

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
}

window.petBubble.on('show-bubble', (d) => { update(d); });
window.petBubble.on('hide-bubble', () => { window.petBubble.invoke('close-bubble').catch(() => {}); });

document.getElementById('bubble').addEventListener('click', () => {
  window.petBubble.invoke('close-bubble').catch(() => {});
});
