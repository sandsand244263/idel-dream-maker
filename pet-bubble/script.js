let currentChoices = null;
let currentEventId = null;

function showBubble(data) {
  if (!data) return;
  const titleEl = document.getElementById('bubble-title');
  const textEl = document.getElementById('bubble-text');
  const choicesEl = document.getElementById('bubble-choices');
  if (data.title) titleEl.textContent = data.title;
  textEl.textContent = data.text || '';
  document.body.dataset.type = data.type || 'event';

  // Choice bubble
  if (data.choices && data.choices.length > 0) {
    currentChoices = data.choices;
    currentEventId = data.eventId || data._eventId;
    choicesEl.innerHTML = '';
    data.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = c.text;
      btn.dataset.index = i;
      btn.addEventListener('click', () => {
        window.petBubble.invoke('choice-selected', { eventId: currentEventId, choiceIndex: i }).catch(() => {});
        choicesEl.classList.add('hidden');
        currentChoices = null;
        currentEventId = null;
        window.petBubble.invoke('close-bubble').catch(() => {});
      });
      choicesEl.appendChild(btn);
    });
    choicesEl.classList.remove('hidden');
  } else {
    currentChoices = null;
    currentEventId = null;
    choicesEl.classList.add('hidden');
  }

  document.getElementById('bubble').style.display = 'block';
}

document.getElementById('bubble').addEventListener('click', (e) => {
  if (e.target.closest('.choice-btn')) return;
  if (document.body.dataset.type === 'chime') return;
  if (currentChoices) return;
  window.petBubble.invoke('close-bubble').catch(() => {});
});

window.petBubble.on('show-bubble', (data) => { showBubble(data); });
window.petBubble.on('show-choice-bubble', (data) => { showBubble(data); });

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
