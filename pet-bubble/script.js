let currentChoices = null;
let currentEventId = null;
let storyEventId = null;   // v4：待读故事气泡的事件 ID（点击=读完推进）

function showBubble(data) {
  if (!data) return;
  const titleEl = document.getElementById('bubble-title');
  const textEl = document.getElementById('bubble-text');
  const choicesEl = document.getElementById('bubble-choices');
  if (data.title) titleEl.textContent = data.title;
  textEl.textContent = data.text || '';
  document.body.dataset.type = data.type || 'event';
  // v4：待读故事气泡（story-ready）——常驻，点击=story-read 推进
  if (data.type === 'story') {
    storyEventId = data.eventId || null;
  } else {
    storyEventId = null;
  }

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
        window.petBubble.invoke('choice-selected', { eventId: currentEventId, choiceIndex: i }).then(r => console.log('[choice] result:', r)).catch(() => {});
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
  document.getElementById('bubble').classList.remove('closing');
}

document.getElementById('bubble').addEventListener('click', (e) => {
  if (e.target.closest('.choice-btn')) return;
  if (document.body.dataset.type === 'chime') return;
  if (currentChoices) return;
  const bubble = document.getElementById('bubble');
  // v4：待读故事气泡点击 = 读完推进（story-read），读完主进程会立即检查下一段
  if (storyEventId) {
    const id = storyEventId;
    storyEventId = null;
    window.petBubble.invoke('story-read', { eventId: id }).catch(() => {});
  }
  bubble.classList.add('closing');
  bubble.addEventListener('animationend', () => {
    window.petBubble.invoke('close-bubble').catch(() => {});
  }, { once: true });
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
