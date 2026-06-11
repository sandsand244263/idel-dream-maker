import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ── State ──
let gameState = null;
let scenarioList = [];
let currentScenario = null;
let currentTitle = null;
let unlockedTitles = [];
let eventDismissTimer = null;
let achievementDismissTimer = null;

// ── DOM refs ──
const logArea = document.getElementById('log-area');
const levelValueEl = document.getElementById('level-value');
const titleValueEl = document.getElementById('title-value');
const eventOverlay = document.getElementById('event-overlay');
const eventTitle = document.getElementById('event-title');
const eventText = document.getElementById('event-text');
const achievementOverlay = document.getElementById('achievement-overlay');
const achievementIcon = document.getElementById('achievement-icon');
const achievementName = document.getElementById('achievement-name');
const achievementDesc = document.getElementById('achievement-desc');
const scenarioPanel = document.getElementById('scenario-panel');
const scenarioListEl = document.getElementById('scenario-list');
const scenarioClose = document.getElementById('scenario-close');
const settingsPanel = document.getElementById('settings-panel');
const settingsClose = document.getElementById('settings-close');
const settingsName = document.getElementById('settings-name');
const settingsNameSave = document.getElementById('settings-name-save');
const settingsTheme = document.getElementById('settings-theme');
const titlesPanel = document.getElementById('titles-panel');
const titlesClose = document.getElementById('titles-close');
const titlesListEl = document.getElementById('titles-list');
const aboutPanel = document.getElementById('about-panel');
const aboutClose = document.getElementById('about-close');

const aboutVersion = document.getElementById('about-version');
const aboutPlayer = document.getElementById('about-player');
const aboutScenario = document.getElementById('about-scenario');
const aboutLevel = document.getElementById('about-level');
const aboutTitle = document.getElementById('about-title');
const aboutRuntime = document.getElementById('about-runtime');
const aboutAchievements = document.getElementById('about-achievements');

// ── Init ──
async function init() {
  try {
    const fullState = await invoke('get_full_state');
    gameState = fullState.game;
    currentScenario = fullState.scenario;
    currentTitle = fullState.currentTitle;
    unlockedTitles = fullState.unlockedTitles;
    scenarioList = await invoke('get_scenario_list');
    updateUI();
  } catch (e) {
    addLog('system', `初始化失败: ${e}`);
  }

  listen('game-tick', (event) => {
    gameState = { ...gameState, ...event.payload };
    updateUI();
  });

  listen('event-triggered', (event) => {
    const { id, text, title, color } = event.payload;
    addLog('event', text);
    showEventOverlay(title, color, text);
  });

  listen('level-up', (event) => {
    const { level, title, titleDesc } = event.payload;
    currentTitle = { name: title, color: event.payload.titleColor, desc: titleDesc };
    addLog('levelup', `等级 ${level}！${title}`);
  });

  listen('achievement-unlocked', (event) => {
    const { id, name, desc, icon } = event.payload;
    addLog('achievement', `${name}: ${desc}`);
    showAchievementOverlay(icon, name, desc);
  });

  listen('scenario-changed', (event) => {
    currentScenario = event.payload.scenario;
    gameState = event.payload.game;
    updateUI();
    addLog('info', `切换至: ${currentScenario.nameCN}`);
  });
}

// ── UI Update ──
function updateUI() {
  if (!gameState) return;
  levelValueEl.textContent = gameState.level;
  if (currentTitle) {
    titleValueEl.textContent = currentTitle.name;
    titleValueEl.style.color = currentTitle.color;
  }
}

// ── Log ──
function addLog(type, message) {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const ts = document.createElement('span');
  ts.className = 'ts';
  const now = new Date();
  ts.textContent = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
  const msg = document.createElement('span');
  msg.className = 'msg';
  msg.textContent = message;
  entry.appendChild(ts);
  entry.appendChild(msg);
  logArea.appendChild(entry);
  logArea.scrollTop = logArea.scrollHeight;
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

// ── Event Overlay ──
function showEventOverlay(title, color, text) {
  if (eventDismissTimer) clearTimeout(eventDismissTimer);
  eventTitle.textContent = title;
  eventTitle.style.color = color;
  eventText.textContent = text;
  eventOverlay.classList.remove('hidden');
  eventDismissTimer = setTimeout(() => {
    eventOverlay.classList.add('hidden');
  }, 6000);
}

eventOverlay.addEventListener('click', () => {
  eventOverlay.classList.add('hidden');
  if (eventDismissTimer) clearTimeout(eventDismissTimer);
});

// ── Achievement Overlay ──
function showAchievementOverlay(icon, name, desc) {
  if (achievementDismissTimer) clearTimeout(achievementDismissTimer);
  achievementIcon.textContent = icon;
  achievementName.textContent = name;
  achievementDesc.textContent = desc;
  achievementOverlay.classList.remove('hidden');
  achievementDismissTimer = setTimeout(() => {
    achievementOverlay.classList.add('hidden');
  }, 8000);
}

achievementOverlay.addEventListener('click', () => {
  achievementOverlay.classList.add('hidden');
  if (achievementDismissTimer) clearTimeout(achievementDismissTimer);
});

// ── Button Handlers ──
document.getElementById('btn-scenario').addEventListener('click', async () => {
  try {
    scenarioList = await invoke('get_scenario_list');
  } catch (e) {
    addLog('system', '获取剧本列表失败');
  }
  renderScenarioPanel();
  scenarioPanel.classList.remove('hidden');
});

document.getElementById('btn-titles').addEventListener('click', () => {
  renderTitlesPanel();
  titlesPanel.classList.remove('hidden');
});

document.getElementById('btn-about').addEventListener('click', () => {
  updateAboutPanel();
  aboutPanel.classList.remove('hidden');
});

document.getElementById('btn-settings').addEventListener('click', () => {
  settingsName.value = gameState?.player_name || '';
  settingsTheme.value = gameState?.selected_font_theme || 'green';
  settingsPanel.classList.remove('hidden');
});

document.getElementById('btn-hide').addEventListener('click', async () => {
  try {
    await invoke('hide_window');
  } catch (e) {}
});

// ── About Panel ──
aboutClose.addEventListener('click', () => aboutPanel.classList.add('hidden'));

function updateAboutPanel() {
  if (!gameState) return;
  aboutVersion.textContent = 'v0.3.0-beta';
  aboutPlayer.textContent = gameState.player_name;
  aboutScenario.textContent = currentScenario?.nameCN || '?';
  aboutLevel.textContent = gameState.level;
  aboutTitle.textContent = currentTitle?.name || '?';
  const totalSec = Math.floor(gameState.total_runtime_ms / 1000);
  aboutRuntime.textContent = `${Math.floor(totalSec / 3600)}h${pad(Math.floor((totalSec % 3600) / 60))}m`;
  aboutAchievements.textContent = `${gameState.unlockedAchievements.length}`;
}

// ── Theme ──
function applyTheme(id) {
  document.documentElement.className = `theme-${id}`;
}

// ── Scenario Panel ──
function renderScenarioPanel() {
  scenarioListEl.innerHTML = '';
  const currentId = gameState?.scenario_id;

  scenarioList.forEach(s => {
    const card = document.createElement('div');
    card.className = `scenario-card${s.id === currentId ? ' active' : ''}`;
    card.innerHTML = `
      <div class="scenario-name" style="color: ${s.id === currentId ? '#00FF00' : '#888'}">${s.nameCN} (${s.name})</div>
      <div class="scenario-desc">${s.description}</div>
      <div class="scenario-stats">
        <span>称号 ${s.titleCount}</span>
        <span>事件 ${s.eventCount}</span>
        <span>成就 ${s.achievementCount}</span>
      </div>
    `;
    card.addEventListener('click', async () => {
      if (s.id === currentId) {
        scenarioPanel.classList.add('hidden');
        return;
      }
      try {
        const result = await invoke('select_scenario', { id: s.id });
        gameState = result.game;
        currentScenario = result.scenario;
        currentTitle = { name: result.scenario.playerTitle, color: '#888', desc: '' };
        updateUI();
        addLog('info', `切换至: ${currentScenario.nameCN}`);
        scenarioPanel.classList.add('hidden');
      } catch (e) {
        addLog('system', '切换失败');
      }
    });
    scenarioListEl.appendChild(card);
  });
}

scenarioClose.addEventListener('click', () => scenarioPanel.classList.add('hidden'));

// ── Settings Panel ──
settingsClose.addEventListener('click', () => settingsPanel.classList.add('hidden'));

settingsNameSave.addEventListener('click', async () => {
  const name = settingsName.value.trim();
  if (!name) return;
  try {
    await invoke('set_player_name', { name });
    if (gameState) gameState.player_name = name;
    addLog('info', `名称: ${name}`);
  } catch (e) {
    addLog('system', '设置名称失败');
  }
});

settingsTheme.addEventListener('change', async () => {
  const theme = settingsTheme.value;
  try {
    await invoke('set_font_theme', { theme });
    if (gameState) gameState.selected_font_theme = theme;
    applyTheme(theme);
    addLog('info', `主题: ${theme}`);
  } catch (e) {
    addLog('system', '切换主题失败');
  }
});

// ── Titles Panel ──
titlesClose.addEventListener('click', () => titlesPanel.classList.add('hidden'));

async function renderTitlesPanel() {
  titlesListEl.innerHTML = '';
  try {
    const detail = await invoke('get_scenario_detail', { id: gameState?.scenario_id });
    detail.titles.forEach(t => {
      const unlocked = t.level <= gameState.level;
      const item = document.createElement('div');
      item.className = `title-item${unlocked ? '' : ' locked'}`;
      item.innerHTML = `
        <span class="title-level">Lv.${t.level}</span>
        <span class="title-name" style="color: ${unlocked ? t.color : 'var(--dim)'}">${unlocked ? t.name : '???'}</span>
        <span class="title-desc">${unlocked ? t.desc : '???'}</span>
      `;
      titlesListEl.appendChild(item);
    });
  } catch (e) {
    titlesListEl.innerHTML = '<div class="log-entry system">加载失败</div>';
  }
}

// ── Title/Scenario click in status bar ──
titleValueEl.addEventListener('click', () => {
  renderTitlesPanel();
  titlesPanel.classList.remove('hidden');
});

// ── Init app ──
init().then(() => {
  addLog('system', 'v0.3.0-beta 加载完成');

  if (gameState) {
    applyTheme(gameState.selected_font_theme || 'green');
    const totalSec = Math.floor(gameState.total_runtime_ms / 1000);
    if (totalSec > 60) {
      addLog('info', `已挂机 ${Math.floor(totalSec/3600)}h${Math.floor((totalSec%3600)/60)}m，等级 ${gameState.level}`);
    }
  }
});
