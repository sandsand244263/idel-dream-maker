import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

let gameState = null;
let scenarioList = [];
let currentScenario = null;
let currentTitle = null;
let hubLevel = 1;
let eventDismissTimer = null;
let achievementDismissTimer = null;

const logArea = document.getElementById('log-area');
const hubView = document.getElementById('hub-view');
const hubGreeting = document.getElementById('hub-greeting');
const hubPlayerName = document.getElementById('hub-player-name');
const hubLevelDisplay = document.getElementById('hub-level-display');
const hubScenarioList = document.getElementById('hub-scenario-list');
const hubDrawBtn = document.getElementById('hub-draw-btn');
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
const btnBackHub = document.getElementById('btn-backhub');

async function init() {
  try {
    const fullState = await invoke('get_full_state');
    gameState = fullState.game;
    currentScenario = fullState.scenario;
    currentTitle = fullState.currentTitle;
    hubLevel = fullState.hubLevel || 1;
    scenarioList = await invoke('get_scenario_list');
  } catch (e) {
    addLog('system', '初始化失败');
  }

  updateUI();
  renderHubView();
  switchView(gameState?.is_in_hub !== false);

  listen('game-tick', (event) => {
    if (gameState?.is_in_hub) {
      gameState = { ...gameState, ...event.payload };
      if (event.payload.hub_total_exp !== undefined) {
        hubLevel = calcLevel(event.payload.hub_total_exp);
      }
      renderHubView();
    } else {
      gameState = { ...gameState, ...event.payload };
      updateUI();
    }
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
    updateUI();
  });

  listen('achievement-unlocked', (event) => {
    const { id, name, desc, icon } = event.payload;
    addLog('achievement', `${name}: ${desc}`);
    showAchievementOverlay(icon, name, desc);
  });

  listen('scenario-changed', (event) => {
    gameState = event.payload.game;
    currentScenario = event.payload.scenario;
    currentTitle = { name: event.payload.scenario.playerTitle, color: '#888', desc: '' };
    switchView(false);
    addLog('info', `进入: ${currentScenario.nameCN}`);
  });
}

function switchView(inHub) {
  if (inHub) {
    hubView.classList.remove('hidden');
    logArea.classList.add('hidden');
    btnBackHub.classList.add('hidden');
  } else {
    hubView.classList.add('hidden');
    logArea.classList.remove('hidden');
    btnBackHub.classList.remove('hidden');
  }
}

function calcLevel(exp) {
  if (exp <= 0) return 1;
  return Math.floor(Math.sqrt(exp / 100)) + 1;
}

function formatRuntime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${h}h${pad(m)}m`;
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

// ── Hub View ──

function renderHubView() {
  if (!gameState) return;
  hubGreeting.textContent = '欢迎回来';
  hubPlayerName.textContent = gameState.player_name;
  hubLevelDisplay.textContent = `大厅 Lv.${hubLevel}`;

  renderHubScenarioCards();
}

function renderHubScenarioCards() {
  hubScenarioList.innerHTML = '';
  const missionCount = scenarioList.length;

  scenarioList.forEach(s => {
    const card = document.createElement('div');
    card.className = 'hub-card';
    card.innerHTML = `
      <div class="hub-card-name">${s.nameCN} (${s.name})</div>
      <div class="hub-card-desc">${s.description}</div>
      <div class="hub-card-meta">${s.eventCount} 事件 · ${s.achievementCount} 成就</div>
    `;
    card.addEventListener('click', async () => {
      const alias = window.prompt(`进入「${s.nameCN}」— 输入该剧本内的名称（留空用默认）`);
      if (alias === null) return;
      try {
        const result = await invoke('select_scenario', { id: s.id, alias: alias || null });
        gameState = result.game;
        currentScenario = result.scenario;
        currentTitle = { name: result.scenario.playerTitle, color: '#888', desc: '' };
        switchView(false);
        addLog('info', `进入: ${currentScenario.nameCN}`);
      } catch (e) {
        addLog('system', '进入剧本失败');
      }
    });
    hubScenarioList.appendChild(card);
  });
}

// ── Draw ──

hubDrawBtn.addEventListener('click', async () => {
  try {
    const s = await invoke('draw_scenario');
    if (!s) return;
    const alias = window.prompt(`抽到「${s.nameCN}」— 输入该剧本内的名称（留空用默认）`);
    if (alias === null) return;
    const result = await invoke('select_scenario', { id: s.id, alias: alias || null });
    gameState = result.game;
    currentScenario = result.scenario;
    currentTitle = { name: result.scenario.playerTitle, color: '#888', desc: '' };
    switchView(false);
    addLog('info', `抽到并进入: ${currentScenario.nameCN}`);
  } catch (e) {
    addLog('system', '抽取失败');
  }
});

// ── Back to Hub ──

btnBackHub.addEventListener('click', async () => {
  try {
    const result = await invoke('exit_to_hub_cmd');
    gameState.hub_total_exp = result.hubTotalExp;
    hubLevel = result.hubLevel;
    gameState.is_in_hub = true;
    switchView(true);
    renderHubView();
    addLog('info', `返回大厅 — 大厅 Lv.${hubLevel}`);
  } catch (e) {
    addLog('system', '返回失败');
  }
});

// ── UI Update (Scenario Mode) ──

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

// ── Buttons ──

document.getElementById('btn-scenario').addEventListener('click', async () => {
  try {
    scenarioList = await invoke('get_scenario_list');
  } catch (e) {}
  renderScenarioPanel();
  scenarioPanel.classList.remove('hidden');
});

document.getElementById('btn-titles').addEventListener('click', () => {
  renderTitlesPanel();
  titlesPanel.classList.remove('hidden');
});

document.getElementById('btn-about').addEventListener('click', () => {
  aboutVersion.textContent = 'v0.3.0-beta';
  aboutPlayer.textContent = gameState?.player_name || '?';
  aboutScenario.textContent = currentScenario?.nameCN || '大厅';
  aboutLevel.textContent = gameState?.is_in_hub ? `Lv.${hubLevel}（大厅）` : `Lv.${gameState?.level || '?'}`;
  aboutTitle.textContent = currentTitle?.name || '?';
  aboutRuntime.textContent = gameState?.is_in_hub ? '-' : formatRuntime(gameState?.total_runtime_ms || 0);
  aboutAchievements.textContent = `${gameState?.unlockedAchievements?.length || 0}`;
  aboutPanel.classList.remove('hidden');
});

aboutClose.addEventListener('click', () => aboutPanel.classList.add('hidden'));

document.getElementById('btn-settings').addEventListener('click', () => {
  settingsName.value = gameState?.player_name || '';
  settingsTheme.value = gameState?.selected_font_theme || 'green';
  settingsPanel.classList.remove('hidden');
});

document.getElementById('btn-hide').addEventListener('click', async () => {
  try { await invoke('hide_window'); } catch (e) {}
});

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
      <div class="scenario-stats"><span>事件 ${s.eventCount}</span><span>成就 ${s.achievementCount}</span></div>
    `;
    card.addEventListener('click', async () => {
      const alias = window.prompt(`进入「${s.nameCN}」— 输入该剧本内的名称（留空用默认）`);
      if (alias === null) return;
      try {
        const result = await invoke('select_scenario', { id: s.id, alias: alias || null });
        gameState = result.game;
        currentScenario = result.scenario;
        currentTitle = { name: result.scenario.playerTitle, color: '#888', desc: '' };
        switchView(false);
        addLog('info', `进入: ${currentScenario.nameCN}`);
        scenarioPanel.classList.add('hidden');
      } catch (e) {
        addLog('system', '进入失败');
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
    renderHubView();
  } catch (e) {}
});

settingsTheme.addEventListener('change', async () => {
  const theme = settingsTheme.value;
  try {
    await invoke('set_font_theme', { theme });
    if (gameState) gameState.selected_font_theme = theme;
    applyTheme(theme);
  } catch (e) {}
});

// ── Titles Panel ──

titlesClose.addEventListener('click', () => titlesPanel.classList.add('hidden'));

async function renderTitlesPanel() {
  titlesListEl.innerHTML = '';

  if (gameState?.is_in_hub) {
    try {
      const hubTitles = await invoke('get_hub_titles');
      hubTitles.forEach(s => {
        const group = document.createElement('div');
        group.className = 'hub-title-group';
        const summary = document.createElement('div');
        summary.className = 'hub-title-summary';
        summary.innerHTML = `
          <span class="hub-title-arrow">▶</span>
          <span class="hub-title-scenario">${s.nameCN}</span>
          <span class="hub-title-count">${s.unlockedCount}/${s.totalCount}</span>
        `;
        const body = document.createElement('div');
        body.className = 'hub-title-body hidden';
        s.unlockedTitles.forEach(name => {
          const item = document.createElement('div');
          item.className = 'title-item';
          item.innerHTML = `<span class="title-name" style="color:var(--fg);font-size:10px">${name}</span>`;
          body.appendChild(item);
        });
        if (s.unlockedTitles.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'title-item';
          empty.innerHTML = `<span class="title-desc" style="font-size:10px">尚无解锁称号</span>`;
          body.appendChild(empty);
        }
        summary.addEventListener('click', () => {
          body.classList.toggle('hidden');
          summary.querySelector('.hub-title-arrow').textContent =
            body.classList.contains('hidden') ? '▶' : '▼';
        });
        group.appendChild(summary);
        group.appendChild(body);
        titlesListEl.appendChild(group);
      });
    } catch (e) {}
    return;
  }

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
  } catch (e) {}
}

titleValueEl.addEventListener('click', () => {
  renderTitlesPanel();
  titlesPanel.classList.remove('hidden');
});

// ── Init ──

init().then(() => {
  applyTheme(gameState?.selected_font_theme || 'green');
  if (!gameState?.is_in_hub) {
    switchView(false);
    addLog('info', `已挂机 ${formatRuntime(gameState.total_runtime_ms)}，等级 ${gameState.level}`);
  }
});
