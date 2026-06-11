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
const cmdInput = document.getElementById('cmd-input');

const playerNameEl = document.getElementById('player-name');
const scenarioNameEl = document.getElementById('scenario-name');
const levelValueEl = document.getElementById('level-value');
const titleValueEl = document.getElementById('title-value');
const expValueEl = document.getElementById('exp-value');
const runtimeValueEl = document.getElementById('runtime-value');
const achievementsValueEl = document.getElementById('achievements-value');

const eventOverlay = document.getElementById('event-overlay');
const eventTitle = document.getElementById('event-title');
const eventText = document.getElementById('event-text');
const eventClose = document.getElementById('event-close');

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
    addLog('levelup', `等级 ${level}！称号晋升: ${title}`);
  });

  listen('achievement-unlocked', (event) => {
    const { id, name, desc, icon } = event.payload;
    achievementsValueEl.textContent = gameState?.unlockedAchievements?.length || '?';
    addLog('achievement', `${name}: ${desc}`);
    showAchievementOverlay(icon, name, desc);
  });

  listen('scenario-changed', (event) => {
    currentScenario = event.payload.scenario;
    gameState = event.payload.game;
    updateUI();
    addLog('info', `切换剧本至: ${currentScenario.nameCN} (${currentScenario.name})`);
  });
}

// ── UI Update ──
function updateUI() {
  if (!gameState) return;
  playerNameEl.textContent = gameState.player_name;
  if (currentScenario) {
    scenarioNameEl.textContent = currentScenario.nameCN;
  }
  levelValueEl.textContent = gameState.level;
  if (currentTitle) {
    titleValueEl.textContent = currentTitle.name;
    titleValueEl.style.color = currentTitle.color;
  }
  const expForNext = calcExpForLevel(gameState.level + 1);
  const expForCurrent = calcExpForLevel(gameState.level);
  const progress = expForNext - expForCurrent > 0
    ? ((gameState.total_exp_earned - expForCurrent) / (expForNext - expForCurrent) * 100).toFixed(1)
    : '100.0';
  expValueEl.textContent = `${Math.floor(gameState.total_exp_earned)} (${progress}%)`;
  runtimeValueEl.textContent = formatRuntime(gameState.total_runtime_ms);
  achievementsValueEl.textContent = gameState.unlockedAchievements.length;
}

function calcExpForLevel(level) {
  if (level <= 1) return 0;
  return 100 * (level - 1) * (level - 1);
}

function formatRuntime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n) {
  return n.toString().padStart(2, '0');
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

eventClose.addEventListener('click', () => {
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

// ── Commands ──
const commands = {
  help() {
    addLog('info', '可用命令:');
    addLog('info', '  help        - 显示此帮助');
    addLog('info', '  scenario    - 打开剧本选择');
    addLog('info', '  settings    - 打开设置');
    addLog('info', '  titles      - 查看称号一览');
    addLog('info', '  name <xxx>  - 设置玩家名称');
    addLog('info', '  theme <id>  - 切换主题 (green|amber|cold|paper|matrix)');
    addLog('info', '  status      - 显示当前状态');
    addLog('info', '  clear       - 清屏');
    addLog('info', '  hide        - 隐藏窗口到托盘');
  },

  async scenario() {
    try {
      scenarioList = await invoke('get_scenario_list');
    } catch (e) {
      addLog('system', `获取剧本列表失败: ${e}`);
    }
    renderScenarioPanel();
    scenarioPanel.classList.remove('hidden');
  },

  settings() {
    settingsName.value = gameState?.player_name || '';
    settingsTheme.value = gameState?.selected_font_theme || 'green';
    settingsPanel.classList.remove('hidden');
  },

  titles() {
    renderTitlesPanel();
    titlesPanel.classList.remove('hidden');
  },

  async name(...args) {
    const newName = args.join(' ');
    if (!newName) {
      addLog('info', `当前名称: ${gameState?.player_name}`);
      return;
    }
    try {
      await invoke('set_player_name', { name: newName });
      if (gameState) gameState.player_name = newName;
      updateUI();
      addLog('info', `名称已设为: ${newName}`);
    } catch (e) {
      addLog('system', `设置名称失败: ${e}`);
    }
  },

  async theme(id) {
    const valid = ['green', 'amber', 'cold', 'paper', 'matrix'];
    if (!id || !valid.includes(id)) {
      addLog('info', `当前主题: ${gameState?.selected_font_theme}`);
      addLog('info', `可用主题: ${valid.join(', ')}`);
      return;
    }
    try {
      await invoke('set_font_theme', { theme: id });
      if (gameState) gameState.selected_font_theme = id;
      applyTheme(id);
      addLog('info', `主题已切换: ${id}`);
    } catch (e) {
      addLog('system', `切换主题失败: ${e}`);
    }
  },

  status() {
    if (!gameState) return;
    addLog('info', `玩家: ${gameState.player_name}`);
    addLog('info', `剧本: ${currentScenario?.nameCN || '?'}`);
    addLog('info', `等级: ${gameState.level}`);
    addLog('info', `称号: ${currentTitle?.name || '?'}`);
    addLog('info', `总经验: ${Math.floor(gameState.total_exp_earned)}`);
    addLog('info', `运行时间: ${formatRuntime(gameState.total_runtime_ms)}`);
    addLog('info', `成就: ${gameState.unlockedAchievements.length}/${scenarioList.find(s => s.id === gameState.scenario_id)?.achievementCount || '?'}`);
  },

  clear() {
    logArea.innerHTML = '';
  },

  async hide() {
    try {
      await invoke('hide_window');
    } catch (e) {
      addLog('system', `隐藏失败: ${e}`);
    }
  },
};

// ── Command Input ──
cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const input = cmdInput.value.trim();
    cmdInput.value = '';
    if (!input) return;
    addLog('info', `> ${input}`);
    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (commands[cmd]) {
      commands[cmd](...args);
    } else {
      addLog('system', `未知命令: ${cmd}。输入 help 查看可用命令。`);
    }
  }
});

// ── Theme ──
function applyTheme(id) {
  document.documentElement.className = `theme-${id}`;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
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
        <span>称号 ${s.titleCount} 个</span>
        <span>事件 ${s.eventCount} 条</span>
        <span>成就 ${s.achievementCount} 个</span>
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
        addLog('info', `切换剧本至: ${currentScenario.nameCN}`);
        scenarioPanel.classList.add('hidden');
      } catch (e) {
        addLog('system', `切换剧本失败: ${e}`);
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
    updateUI();
    addLog('info', `名称已设为: ${name}`);
  } catch (e) {
    addLog('system', `设置名称失败: ${e}`);
  }
});

settingsTheme.addEventListener('change', async () => {
  const theme = settingsTheme.value;
  try {
    await invoke('set_font_theme', { theme });
    if (gameState) gameState.selected_font_theme = theme;
    applyTheme(theme);
    addLog('info', `主题已切换: ${theme}`);
  } catch (e) {
    addLog('system', `切换主题失败: ${e}`);
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
        <span class="title-name" style="color: ${t.color}">${t.name}</span>
        <span class="title-desc">${unlocked ? t.desc : '???'}</span>
      `;
      titlesListEl.appendChild(item);
    });
  } catch (e) {
    titlesListEl.innerHTML = '<div class="log-entry system">加载称号失败</div>';
  }
}

// ── Click on title to open titles panel ──
titleValueEl.addEventListener('click', () => {
  commands.titles();
});

// ── Status bar scenario click ──
scenarioNameEl.addEventListener('click', () => {
  commands.scenario();
});

// ── Init app ──
init().then(() => {
  addLog('system', 'IdleWorker v0.1.0-beta 加载完成。输入 help 查看命令。');

  if (gameState) {
    applyTheme(gameState.selected_font_theme || 'green');
    // Show runtime info on start
    const totalSec = Math.floor(gameState.total_runtime_ms / 1000);
    if (totalSec > 60) {
      addLog('info', `已挂机 ${formatRuntime(gameState.total_runtime_ms)}，当前等级 ${gameState.level}`);
    }
  }
});
