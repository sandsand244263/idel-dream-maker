// IPC via window.electron (provided by preload.cjs)

const LANG = {
  hubWelcome: '欢迎回来', hubLevel: '大厅 Lv.', drawBtn: '+ 抽取副本',
  noScenarios: '暂无可用的副本', hubEmptyHint: '点击下方 [副本] 或 [+ 抽取副本] 开始，点击 [教程] 查看操作说明',
  btnBack: '大厅', btnScenario: '副本', btnJourney: '历程',
  btnSettings: '设置', btnTutorial: '教程',
  jTitle: '称号', jAchievement: '成就', jEvent: '事件',
  panelScenario: '副本选择', panelTitles: '称号一览', panelAchievement: '成就一览', panelEvent: '事件记录', panelSettings: '设置',
  labelName: '名称',
  settingsSave: '保存', settingsThemeTitle: '主题', ctSave: '应用自定义配色',
  eventHeader: '事件', achievementHeader: '成就解锁',
  systemInitFail: '初始化失败', systemEnterFail: '进入副本失败',
  systemDrawFail: '抽取失败', systemBackFail: '返回失败',
  systemLevelUp: '等级 {0}！{1}',
  systemEntered: '进入: {0}', systemDrew: '抽到并进入: {0}', systemBack: '返回大厅 — 大厅 Lv.{0}',
  systemTitleEquipFail: '佩戴称号失败', systemTitleFetchFail: '获取大厅称号失败',
  systemDetailFail: '获取副本详情失败', systemThemeFail: '切换主题失败',
  logStartHub: '启动完成', logStartScenario: '已挂机 {0}，等级 {1}',
  scenarioEvent: '事件', scenarioAchievement: '成就',
  hubTitleEmpty: '尚无解锁称号',
  aliasTitle: '进入副本', aliasPlaceholder: '输入名称（留空用默认）',
  enterPrompt: '进入「{0}」— 输入名称（留空用默认）',
  aliasCancel: '取消', aliasConfirm: '进入',
  confirmTitle: '返回大厅', confirmDesc: '确定返回大厅吗？副本进度将保留，经验累入全局等级。',
  confirmCancel: '取消', confirmOk: '确定',
  obWelcome: '欢迎来到', obSubtitle: 'Idel-DreamMaker',
  obDesc1: '藏在系统托盘里的宠物陪伴应用', obDesc2: '挂机升级 · 解锁称号与成就',
  obDesc3: '触发故事事件——陪你度过每一刻',
  obHow: '如何开始：', obStep1: '点击 [副本] 或 [+ 抽取副本] 选择一个故事世界',
  obStep2: '进入后自动挂机，经验随时间增长', obStep3: '升级解锁称号，随机弹出故事事件',
  obStep4: '随时点击 [大厅] 退出，经验累入全局等级',
  obTip: '提示：宠物窗口常驻桌面，点击宠物可交互',
  obName: '你的名称', obNamePlaceholder: '输入名称', obStart: '开始冒险',
  dbgEvent: '触发事件', dbgLevelup: '+10 级', dbgAchievement: '解锁成就',
  dbgRuntime: '+1h', dbgHoliday: '节日事件',
  statusHub: '（大厅）', statusNone: '-',
  eventToday: '今天',
  eventDate: '{0}月{1}日',
};

function t(key) { return LANG[key] || key; }
function tf(key, ...args) { let s = t(key); args.forEach((a, i) => { s = s.replace(`{${i}}`, String(a)); }); return s; }

let gameState = null, scenarioList = [], currentScenario = null, currentTitle = null, hubLevel = 1, appVersion = '1.0.0';
let eventDismissTimer = null, achievementDismissTimer = null;
let lastRuntime = 0;

const logArea = document.getElementById('log-area');
const hubView = document.getElementById('hub-view');
const hubGreeting = document.getElementById('hub-greeting');
const hubPlayerName = document.getElementById('hub-player-name');
const hubLevelDisplay = document.getElementById('hub-level-display');
const hubScenarioList = document.getElementById('hub-scenario-list');
const hubDrawBtn = document.getElementById('hub-draw-btn');
const titlebarId = document.getElementById('titlebar-id');
const titlebarLv = document.getElementById('titlebar-lv');
const titlebarTitle = document.getElementById('titlebar-title');
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
const settingsTheme = document.getElementById('theme-swatches');
const titlesPanel = document.getElementById('titles-panel');
const titlesClose = document.getElementById('titles-close');
const titlesListEl = document.getElementById('titles-list');
const achievementPanel = document.getElementById('achievement-panel');
const achievementClose = document.getElementById('achievement-close');
const achievementListEl = document.getElementById('achievement-list');
const btnBackHub = document.getElementById('btn-backhub');
const btnScenario = document.getElementById('btn-scenario');
const btnJourney = document.getElementById('btn-journey');
const journeyMenu = document.getElementById('journey-menu');
const btnSettings = document.getElementById('btn-settings');
const permaStatus = document.getElementById('perma-status');
const permaText = document.getElementById('perma-text');
const saveDot = document.getElementById('save-dot');
const expBarFill = document.getElementById('exp-bar-fill');
const expBarText = document.getElementById('exp-bar-text');
const eventPanel = document.getElementById('event-panel');
const eventClose = document.getElementById('event-close');
const eventListEl = document.getElementById('event-list');

const confirmModal = document.getElementById('confirm-modal');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
let confirmResolver = null;
function showConfirmModal(desc) {
  return new Promise((resolve) => {
    document.getElementById('confirm-desc').textContent = desc;
    confirmModal.classList.remove('hidden'); confirmResolver = resolve;
  });
}
confirmOk.addEventListener('click', () => { confirmModal.classList.add('hidden'); if (confirmResolver) { confirmResolver(true); confirmResolver = null; } });
confirmCancel.addEventListener('click', () => { confirmModal.classList.add('hidden'); if (confirmResolver) { confirmResolver(false); confirmResolver = null; } });

function getTitleByIndex(idx) {
  if (!currentScenario?.titles) return null;
  const t = currentScenario.titles[idx]; return t ? { name: t.name, color: t.color, desc: t.desc } : null;
}

async function init() {
  try {
    const full = await window.electron.invoke('get-full-state');
    gameState = full.game; currentScenario = full.scenario; currentTitle = full.currentTitle;
    hubLevel = full.hubLevel || 1; appVersion = full.appVersion || '1.0.0'; scenarioList = await window.electron.invoke('get-scenario-list');
  } catch (e) { addLog('system', `${t('systemInitFail')}: ${e}`); }
  updateUI(); renderHubView(); renderHubCards(); switchView(gameState?.is_in_hub !== false);
  window.electron.on('game-tick', (event) => {
    const p = event;
    if (gameState?.is_in_hub) {
      gameState = { ...gameState, ...p };
      if (p.hub_total_exp !== undefined) hubLevel = calcLevel(p.hub_total_exp);
      renderHubView();
    } else {
      // Preserve runtime when hub tick sends 0
      if (p.total_runtime_ms === 0 && lastRuntime > 0) p.total_runtime_ms = lastRuntime;
      gameState = { ...gameState, ...p };
      lastRuntime = gameState.total_runtime_ms;
      updateUI();
    }
  });
  window.electron.on('event-triggered', (event) => { addLog('event', event.text); showEventOverlay(event.title, event.color, event.text); });
  window.electron.on('level-up', (event) => {
    currentTitle = { name: event.title, color: event.titleColor, desc: event.titleDesc };
    const logMsg = event.eventText ? `${tf('systemLevelUp', event.level, event.title)} — ${event.eventText}` : tf('systemLevelUp', event.level, event.title);
    addLog('levelup', logMsg);
    // If merged with story event text, show combined notification
    if (event.eventText) {
      showEventOverlay(`Lv.${event.level} — ${event.title || ''}`, event.titleColor || '#FFA500', event.eventText);
    }
    updateUI();
  });
  window.electron.on('achievement-unlocked', (event) => { const { name, desc, icon } = event; addLog('achievement', `${name}: ${desc}`); showAchievementOverlay(icon, name, desc); updateUI(); });
  window.electron.on('scenario-changed', (event) => { gameState = event.game; currentScenario = event.scenario; currentTitle = { name: event.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); updateUI(); });
  window.electron.on('auto-save', () => { flashSaveDot(); });
}

function switchView(inHub) {
  hubView.classList.toggle('hidden', !inHub); logArea.classList.toggle('hidden', inHub);
  btnBackHub.classList.toggle('hidden', inHub); btnScenario.classList.toggle('hidden', inHub);
}

function calcLevel(exp) {
  if (exp <= 0) return 1;
  if (exp <= 980100) return Math.floor(Math.sqrt(exp / 100)) + 1;
  return 100 + Math.floor((exp - 980100) / 30000);
}
function calcExpForLevel(level) { if (level <= 1) return 0; if (level <= 100) return 100 * (level - 1) * (level - 1); return 980100 + (level - 100) * 30000; }
function formatRuntime(ms) { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; return `${h}h${m}m${sec}s`; }
function pad(n) { return n.toString().padStart(2, '0'); }

let toastTimer = null;
function dismissToast() {
  const el = document.getElementById('toast');
  if (!el||el.classList.contains('hidden')||el.classList.contains('closing')) return;
  el.classList.add('closing');
}
function showToast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  if (toastTimer) clearTimeout(toastTimer);
  el.classList.remove('closing');
  el.textContent = msg;
  el.className = 'toast-' + (type || 'error');
  el.classList.remove('hidden');
  toastTimer = setTimeout(() => dismissToast(), 3000);
}
document.getElementById('toast').addEventListener('animationend', () => {
  const el = document.getElementById('toast');
  if (el.classList.contains('closing')) { el.classList.add('hidden'); el.classList.remove('closing'); }
});

// ── Hub View ──
function renderHubView() {
  if (!gameState) return;
  hubGreeting.textContent = t('hubWelcome'); hubPlayerName.textContent = gameState.player_name;
  hubLevelDisplay.textContent = `${t('hubLevel')}${hubLevel}`; hubDrawBtn.textContent = t('drawBtn');
}

function renderHubCards() {
  if (!scenarioList) return;
  hubScenarioList.innerHTML = '';
  if (!scenarioList || scenarioList.length === 0) {
    hubScenarioList.innerHTML = `<div class="hub-empty"><div class="hub-empty-icon">[ ~ ~ ]</div><div class="hub-empty-text">${t('noScenarios')}</div><div class="hub-empty-hint">${t('hubEmptyHint')}</div></div>`;
    return;
  }
  scenarioList.forEach(s => {
    const card = document.createElement('div'); card.className = 'hub-card';
    card.innerHTML = `<div class="hub-card-name">${s.nameCN} (${s.name})</div><div class="hub-card-desc">${s.description}</div><div class="hub-card-meta">${s.eventCount} ${t('scenarioEvent')} · ${s.achievementCount} ${t('scenarioAchievement')}</div>`;
    card.addEventListener('click', async () => {
      try { const r = await window.electron.invoke('select-scenario', { id: s.id, alias: '' }); gameState = r.game; currentScenario = r.scenario; currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); updateUI(); } catch (e) { showToast(t('systemEnterFail'), 'error'); }
    });
    hubScenarioList.appendChild(card);
  });
}

hubDrawBtn.addEventListener('click', async () => {
  try { const s = await window.electron.invoke('draw-scenario'); if (!s) return; const r = await window.electron.invoke('select-scenario', { id: s.id, alias: '' }); gameState = r.game; currentScenario = r.scenario; currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemDrew', currentScenario.nameCN)); updateUI(); } catch (e) { showToast(t('systemDrawFail'), 'error'); }
});

btnBackHub.addEventListener('click', async () => {
  const ok = await showConfirmModal(t('confirmDesc'));
  if (!ok) return;
  try { const r = await window.electron.invoke('exit-to-hub'); gameState.hub_total_exp = r.hubTotalExp; hubLevel = r.hubLevel; gameState.is_in_hub = true; switchView(true); renderHubView(); renderHubCards(); addLog('info', tf('systemBack', hubLevel)); updateUI(); lastRuntime = 0; } catch (e) { showToast(t('systemBackFail'), 'error'); }
});

// ── UI ──
function updateUI() {
  if (!gameState) return;
  const dl = gameState.is_in_hub ? hubLevel : gameState.level;
  const ct = currentTitle || (currentScenario?.titles && currentScenario.titles[gameState.equipped_title_index || 0]);
  titlebarId.textContent = `ID:${gameState.player_name}`; titlebarLv.textContent = `LV:${dl}`;
  if (ct) { titlebarTitle.textContent = ct.name; titlebarTitle.style.color = ct.color || '#888'; }
  updatePermaStatus();
  updateExpBar();
}

function updateExpBar() {
  if (!gameState || !expBarFill || !expBarText) return;
  const exp = gameState.total_exp_earned || 0;
  const lv = gameState.level || 1;
  const currReq = calcExpForLevel(lv);
  const nextReq = calcExpForLevel(lv + 1);
  const pct = nextReq > currReq ? Math.max(0, Math.min(100, ((exp - currReq) / (nextReq - currReq)) * 100)) : 0;
  expBarFill.style.width = `${Math.round(pct)}%`;
  expBarText.textContent = `EXP: ${Math.floor(exp)} / ${nextReq} (${Math.round(pct)}%)`;
}

function updatePermaStatus() {
  if (!gameState) { if (permaText) permaText.textContent = ''; return; }
  const rt = gameState.is_in_hub ? '—' : formatRuntime(gameState.total_runtime_ms || 0);
  const ach = gameState.unlockedAchievements?.length || 0;
  const sc = currentScenario?.nameCN || 'Hub';
  const dl = gameState.is_in_hub ? `Hub Lv.${hubLevel}` : `Lv.${gameState.level}`;
  const title = currentTitle?.name || '?';
  if (permaText) permaText.innerHTML = `${appVersion} | ${sc}<br>${dl} | ${title} | ${rt} | ${t('scenarioAchievement')}:${ach}`;
}

let saveDotTimer = null;
function flashSaveDot() {
  if (!saveDot) return;
  if (saveDotTimer) clearTimeout(saveDotTimer);
  saveDot.classList.remove('hidden');
  saveDot.addEventListener('animationend', function handler(){saveDot.classList.add('hidden');saveDot.removeEventListener('animationend',handler);});
}

function addLog(type, message) {
  const prev = logArea.querySelector('.log-entry.latest');
  if (prev) prev.classList.remove('latest');

  const entry = document.createElement('div'); entry.className = `log-entry ${type} latest`;
  const ts = document.createElement('span'); ts.className = 'ts';
  const now = new Date(); ts.textContent = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
  const msg = document.createElement('span'); msg.className = 'msg'; msg.textContent = message;
  entry.appendChild(ts); entry.appendChild(msg); logArea.appendChild(entry);
  logArea.scrollTop = logArea.scrollHeight;

  // Persist event and levelup entries
  if (type === 'event' || type === 'levelup') {
    window.electron.invoke('add-log-entry', { type, msg: message }).catch(() => {});
  }
}

function dismissEventOverlay() {
  if (eventOverlay.classList.contains('hidden')||eventOverlay.classList.contains('closing')) return;
  eventOverlay.classList.add('closing');
}
function showEventOverlay(title, color, text) {
  if (eventDismissTimer) clearTimeout(eventDismissTimer);
  eventOverlay.classList.remove('closing');
  eventTitle.textContent = title; eventTitle.style.color = color; eventText.textContent = text;
  eventOverlay.classList.remove('hidden'); eventDismissTimer = setTimeout(() => dismissEventOverlay(), 6000);
}
eventOverlay.addEventListener('animationend', () => {
  if (eventOverlay.classList.contains('closing')) { eventOverlay.classList.add('hidden'); eventOverlay.classList.remove('closing'); }
});
eventOverlay.addEventListener('click', () => { dismissEventOverlay(); if (eventDismissTimer) clearTimeout(eventDismissTimer); });

function dismissAchievementOverlay() {
  if (achievementOverlay.classList.contains('hidden')||achievementOverlay.classList.contains('closing')) return;
  achievementOverlay.classList.add('closing');
}
function showAchievementOverlay(icon, name, desc) {
  if (achievementDismissTimer) clearTimeout(achievementDismissTimer);
  achievementOverlay.classList.remove('closing');
  achievementIcon.textContent = icon; achievementName.textContent = name; achievementDesc.textContent = desc;
  achievementOverlay.classList.remove('hidden'); achievementDismissTimer = setTimeout(() => dismissAchievementOverlay(), 8000);
}
achievementOverlay.addEventListener('animationend', () => {
  if (achievementOverlay.classList.contains('closing')) { achievementOverlay.classList.add('hidden'); achievementOverlay.classList.remove('closing'); }
});
achievementOverlay.addEventListener('click', () => { dismissAchievementOverlay(); if (achievementDismissTimer) clearTimeout(achievementDismissTimer); });

btnScenario.addEventListener('click', async () => { try { scenarioList = await window.electron.invoke('get-scenario-list'); } catch (e) { showToast(t('systemDetailFail'), 'error'); } renderScenarioPanel(); scenarioPanel.classList.remove('hidden'); });

// ── Journey submenu ──
btnJourney.addEventListener('click', (e) => { e.stopPropagation(); journeyMenu.classList.toggle('hidden'); });
document.addEventListener('click', () => { journeyMenu.classList.add('hidden'); });
journeyMenu.addEventListener('click', (e) => { e.stopPropagation(); });
document.querySelectorAll('.jm-item').forEach(el => {
  el.addEventListener('click', () => {
    journeyMenu.classList.add('hidden');
    const action = el.dataset.action;
    if (action === 'titles') { renderTitlesPanel(); titlesPanel.classList.remove('hidden'); }
    else if (action === 'achievement') { renderAchievementPanel(); achievementPanel.classList.remove('hidden'); }
    else if (action === 'event') { renderEventPanel(); eventPanel.classList.remove('hidden'); }
  });
});
eventClose.addEventListener('click', () => eventPanel.classList.add('hidden'));

btnSettings.addEventListener('click', () => {
  settingsName.value = gameState?.player_name || '';
  if (gameState?.selected_font_theme === 'custom' && gameState?.custom_theme) {
    const ct = gameState.custom_theme;
    document.getElementById('ct-fg').value = ct.fg; document.getElementById('ct-fg-text').value = ct.fg;
    document.getElementById('ct-bg').value = ct.bg; document.getElementById('ct-bg-text').value = ct.bg;
    document.getElementById('ct-dim').value = ct.dim; document.getElementById('ct-dim-text').value = ct.dim;
    document.getElementById('ct-border').value = ct.border || ct.dim; document.getElementById('ct-border-text').value = ct.border || ct.dim;
    document.getElementById('custom-theme').classList.remove('hidden');
  } else {
    document.getElementById('custom-theme').classList.add('hidden');
  }
  renderThemeSwatches();
  settingsPanel.classList.remove('hidden');
});
settingsClose.addEventListener('click', () => settingsPanel.classList.add('hidden'));
settingsNameSave.addEventListener('click', async () => { const n = settingsName.value.trim(); if (!n) return; try { await window.electron.invoke('set-player-name', { name: n }); if (gameState) gameState.player_name = n; renderHubView(); updateUI(); } catch (e) { showToast(t('systemEnterFail'), 'error'); } });
document.getElementById('btn-tutorial').addEventListener('click', async () => {
  if (onboardingInput) onboardingInput.value = gameState?.player_name || '';
  if (onboardingModal) onboardingModal.classList.remove('hidden');
});

const THEMES = [
  { id:'red', label:'红', fg:'#F38BA8', bg:'#1E0A10', dim:'#BA7D8F' },
  { id:'red-orange', label:'红橙', fg:'#FAB387', bg:'#1E120A', dim:'#BF9E82' },
  { id:'orange', label:'橙', fg:'#FF9E64', bg:'#1E1000', dim:'#C47D3A' },
  { id:'yellow-orange', label:'黄橙', fg:'#EECB8C', bg:'#1E1400', dim:'#C4A050' },
  { id:'yellow', label:'黄', fg:'#F9E2AF', bg:'#1E1C0A', dim:'#C4B892' },
  { id:'yellow-green', label:'黄绿', fg:'#A8D86A', bg:'#0A1400', dim:'#7DAA40' },
  { id:'green', label:'绿', fg:'#00FF00', bg:'#0A0A0A', dim:'#00AA00' },
  { id:'cyan', label:'蓝绿', fg:'#94E2D5', bg:'#0A1E1A', dim:'#75BAAD' },
  { id:'blue', label:'蓝', fg:'#89B4FA', bg:'#0E1428', dim:'#5A7FBF' },
  { id:'blue-purple', label:'蓝紫', fg:'#A2A0F6', bg:'#0E0A1E', dim:'#7F7EC4' },
  { id:'purple', label:'紫', fg:'#CBA6F7', bg:'#1A0E1E', dim:'#A284C4' },
  { id:'pink', label:'红紫', fg:'#F5C2E7', bg:'#1E0E1A', dim:'#C49AB5' },
  { id:'black', label:'黑', fg:'#CDD6F4', bg:'#11111B', dim:'#585B70' },
  { id:'white', label:'白', fg:'#4C4F69', bg:'#EFF1F5', dim:'#9CA0B0' },
  { id:'custom', label:'自定义', fg:'#00FF00', bg:'#0A0A0A', dim:'#00AA00' },
];


function bindCt(id) {
  const p = document.getElementById(id);
  const t = document.getElementById(id + '-text');
  if (!p || !t) return;
  p.addEventListener('input', () => t.value = p.value);
  t.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(t.value)) p.value = t.value; });
}

function renderThemeSwatches() {
  const cur = gameState?.selected_font_theme || 'green';
  settingsTheme.innerHTML = '';
  THEMES.forEach(t => {
    const btn = document.createElement('button');
    btn.dataset.theme = t.id;
    btn.style.cssText = `padding:4px 2px;font-size:11px;background:${t.bg};color:${t.fg};border:2px solid ${t.id === cur ? '#0078D7' : 'transparent'};border-radius:4px;cursor:pointer;font-family:inherit;text-align:center;transition:border-color 0.1s;`;
    btn.textContent = t.label;
    if (t.id === 'custom') {
      btn.style.borderStyle = 'dashed';
      btn.style.gridColumn = '1 / -1';
      const st = getComputedStyle(document.documentElement);
      btn.style.background = st.getPropertyValue('--bg').trim() || t.bg;
      btn.style.color = st.getPropertyValue('--fg').trim() || t.fg;
    }
    btn.addEventListener('click', () => selectTheme(t.id));
    btn.addEventListener('mouseenter', () => { if (t.id !== cur) btn.style.borderColor = '#888'; });
    btn.addEventListener('mouseleave', () => { if (t.id !== cur) btn.style.borderColor = 'transparent'; });
    settingsTheme.appendChild(btn);
  });
}

async function selectTheme(id) {
  if (id === 'custom') {
    document.getElementById('custom-theme').classList.remove('hidden');
    return;
  }
  document.getElementById('custom-theme').classList.add('hidden');
  const t = THEMES.find(x => x.id === id);
  if (t) {
    document.getElementById('ct-fg').value = t.fg; document.getElementById('ct-fg-text').value = t.fg;
    document.getElementById('ct-bg').value = t.bg; document.getElementById('ct-bg-text').value = t.bg;
    document.getElementById('ct-dim').value = t.dim; document.getElementById('ct-dim-text').value = t.dim;
    document.getElementById('ct-border').value = t.dim; document.getElementById('ct-border-text').value = t.dim;
  }
  try { await window.electron.invoke('set-font-theme', { theme: id }); if (gameState) gameState.selected_font_theme = id; applyTheme(id); renderThemeSwatches(); } catch (e) { showToast(t('systemThemeFail'), 'error'); }
}

document.getElementById('ct-save').addEventListener('click', async () => {
  const fg = document.getElementById('ct-fg-text').value;
  const bg = document.getElementById('ct-bg-text').value;
  const dim = document.getElementById('ct-dim-text').value;
  const border = document.getElementById('ct-border-text').value;
  try { await window.electron.invoke('set-custom-theme', { fg, bg, dim, border }); if (gameState) { gameState.selected_font_theme = 'custom'; } applyTheme('custom'); renderThemeSwatches(); } catch (e) { showToast(t('systemThemeFail'), 'error'); }
});

function applyTheme(id) {
  document.documentElement.className = `theme-${id}`;
  if (id === 'custom' && gameState?.custom_theme) {
    const ct = gameState.custom_theme;
    document.documentElement.style.setProperty('--fg', ct.fg);
    document.documentElement.style.setProperty('--bg', ct.bg);
    document.documentElement.style.setProperty('--dim', ct.dim);
    document.documentElement.style.setProperty('--border', ct.border || ct.dim);
  }
}
function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
}

function renderScenarioPanel() {
  scenarioListEl.innerHTML = ''; const cid = gameState?.scenario_id;
  scenarioList.forEach(s => {
    const card = document.createElement('div'); card.className = `scenario-card${s.id === cid ? ' active' : ''}`;
    card.innerHTML = `<div class="scenario-name" style="color:${s.id === cid ? '#0F0' : '#888'}">${s.nameCN} (${s.name})</div><div class="scenario-desc">${s.description}</div><div class="scenario-stats"><span>${s.eventCount} ${t('scenarioEvent')}</span><span>${s.achievementCount} ${t('scenarioAchievement')}</span></div>`;
    card.addEventListener('click', async () => { try { const r = await window.electron.invoke('select-scenario', { id: s.id, alias: '' }); gameState = r.game; currentScenario = r.scenario; currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); scenarioPanel.classList.add('hidden'); updateUI(); } catch (e) { showToast(t('systemEnterFail'), 'error'); } });
    scenarioListEl.appendChild(card);
  });
}
document.getElementById('btn-close').addEventListener('click', () => window.electron.invoke('hide-window'));
scenarioClose.addEventListener('click', () => scenarioPanel.classList.add('hidden'));
titlesClose.addEventListener('click', () => titlesPanel.classList.add('hidden'));
achievementClose.addEventListener('click', () => achievementPanel.classList.add('hidden'));

async function renderTitlesPanel() {
  titlesListEl.innerHTML = '';
  if (gameState?.is_in_hub) {
    try {
      const ht = await window.electron.invoke('get-hub-titles');
      for (const s of ht) {
        const g = document.createElement('div'); g.className = 'hub-title-group';
        const sm = document.createElement('div'); sm.className = 'hub-title-summary';
        sm.innerHTML = `▶ <span class="hub-title-scenario">${s.nameCN}</span> <span class="hub-title-count">${s.unlockedCount}/${s.totalCount}</span>`;
        const bd = document.createElement('div'); bd.className = 'hub-title-body hidden';
        if (s.unlockedTitles.length) {
          for (const n of s.unlockedTitles) {
            const isEquipped = s.equippedTitle === n;
            const it = document.createElement('div'); it.className = `title-item${isEquipped ? ' equipped' : ''}`;
            it.innerHTML = `<span class="title-name" style="color:var(--fg)">${n}</span>`;
            it.style.cursor = 'pointer';
            it.addEventListener('click', async () => {
              try {
                const r = await window.electron.invoke('set-title', { name: n, scenarioId: s.id });
                if (r) {
                  currentTitle = { name: r.name, color: r.color, desc: r.desc }; updateUI();
                  // 只更新该组内 item 的 equipped 标记，不重新渲染面板（保留展开状态）
                  bd.querySelectorAll('.title-item').forEach(item => item.classList.remove('equipped'));
                  it.classList.add('equipped');
                }
              } catch(e) { showToast(t('systemTitleEquipFail'), 'error'); }
            });
            bd.appendChild(it);
          }
        } else {
          bd.innerHTML = `<div class="title-item"><span class="title-name" style="color:var(--dim)">${t('hubTitleEmpty')}</span></div>`;
        }
        sm.addEventListener('click', () => { bd.classList.toggle('hidden'); sm.innerHTML = bd.classList.contains('hidden') ? `▶ <span class="hub-title-scenario">${s.nameCN}</span> <span class="hub-title-count">${s.unlockedCount}/${s.totalCount}</span>` : `▼ <span class="hub-title-scenario">${s.nameCN}</span> <span class="hub-title-count">${s.unlockedCount}/${s.totalCount}</span>`; });
        g.appendChild(sm); g.appendChild(bd); titlesListEl.appendChild(g);
      }
    } catch (e) { showToast(t('systemTitleFetchFail'), 'error'); } return;
  }
  try { const d = await window.electron.invoke('get-scenario-detail', { id: gameState?.scenario_id }); const cur = gameState?.equipped_title_index ?? 0; d.titles.forEach((t, idx) => { const u = t.level <= gameState.level; const eq = u && idx === cur; const it = document.createElement('div'); it.className = `title-item${u ? '' : ' locked'}${eq ? ' equipped' : ''}`; it.innerHTML = `<span class="title-level">Lv.${t.level}</span><span class="title-name" style="color:${u ? t.color : 'var(--dim)'}">${u ? t.name : '???'}</span><span class="title-desc">${u ? t.desc : '???'}</span>`; if (u) { it.style.cursor = 'pointer'; it.addEventListener('click', async () => { try { const r = await window.electron.invoke('set-title', { index: idx }); if (gameState) gameState.equipped_title_index = idx; if (r) currentTitle = { name: r.name, color: r.color, desc: r.desc }; updateUI(); renderTitlesPanel(); } catch (e) { showToast(t('systemTitleEquipFail'), 'error'); } }); } titlesListEl.appendChild(it); }); } catch (e) { showToast(t('systemDetailFail'), 'error'); }
}

async function renderAchievementPanel() {
  achievementListEl.innerHTML = '';
  const id = gameState?.scenario_id;
  if (!id) { achievementListEl.innerHTML = '<div class="hub-empty-text">请先进入副本</div>'; return; }
  try {
    const d = await window.electron.invoke('get-scenario-detail', { id });
    if (!d || !d.achievements) return;
    const unlocked = gameState?.unlockedAchievements || [];
    d.achievements.forEach(a => {
      const u = unlocked.includes(a.id);
      const it = document.createElement('div'); it.className = `title-item${u ? '' : ' locked'}`;
      const condStr = a.condition.type === 'level' ? `Lv.${a.condition.value}` : a.condition.type === 'runtime' ? `挂机测试` : a.condition.type === 'events' ? `触发${a.condition.value}事件` : `解锁${a.condition.value}称号`;
      it.innerHTML = `<span class="title-name" style="color:${u ? 'var(--fg)' : 'var(--dim)'}">${u ? a.name : '???'}</span><span class="title-desc">${u ? a.desc : condStr}</span>`;
      achievementListEl.appendChild(it);
    });
  } catch (e) { showToast(t('systemDetailFail'), 'error'); }
}

function dayLabel(d) {
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  if (d === today) return t('eventToday');
  const p = d.split('-');
  return tf('eventDate', parseInt(p[1]), parseInt(p[2]));
}

async function renderEventPanel() {
  eventListEl.innerHTML = '<div class="loading">加载中...</div>';
  try {
    const dates = await window.electron.invoke('get-log-dates');
    if (!dates || dates.length === 0) {
      eventListEl.innerHTML = '<div class="hub-empty-text">暂无事件记录</div>';
      return;
    }
    eventListEl.innerHTML = '';
    const today = `${new Date().getFullYear()}-${pad(new Date().getMonth()+1)}-${pad(new Date().getDate())}`;
    for (const d of dates) {
      const expanded = (d === today);
      const entries = expanded ? (await window.electron.invoke('get-log-entries', { date: d }) || []) : [];
      const grp = document.createElement('div'); grp.className = 'date-group';
      const hdr = document.createElement('div'); hdr.className = 'date-header';
      hdr.dataset.date = d;
      hdr.dataset.loaded = expanded ? '1' : '0';
      hdr.innerHTML = expanded ? `▼ ${dayLabel(d)}` : `▶ ${dayLabel(d)}`;
      const body = document.createElement('div'); body.className = 'date-body' + (expanded ? '' : ' hidden');
      if (expanded) {
        entries.forEach(e => {
          const item = document.createElement('div'); item.className = 'log-entry event';
          item.innerHTML = `<span class="ts">[${e.t}]</span><span class="msg">${e.m}</span>`;
          body.appendChild(item);
        });
      } else {
        hdr.dataset.count = '0';
      }
      hdr.addEventListener('click', async () => {
        const isCollapsed = body.classList.contains('hidden');
        if (isCollapsed) {
          body.innerHTML = '<div class="loading">加载中...</div>';
          body.classList.remove('hidden');
          const items = await window.electron.invoke('get-log-entries', { date: d }) || [];
          body.innerHTML = '';
          items.forEach(e => {
            const item = document.createElement('div'); item.className = 'log-entry event';
            item.innerHTML = `<span class="ts">[${e.t}]</span><span class="msg">${e.m}</span>`;
            body.appendChild(item);
          });
          hdr.innerHTML = `▼ ${dayLabel(d)}`;
        } else {
          body.classList.add('hidden');
          hdr.innerHTML = `▶ ${dayLabel(d)}`;
        }
      });
      grp.appendChild(hdr); grp.appendChild(body); eventListEl.appendChild(grp);
    }
  } catch (e) { eventListEl.innerHTML = '<div class="hub-empty-text">加载失败</div>'; }
}

async function updateTooltip() {
  if (!gameState) return;
  const rt = formatRuntime(gameState.total_runtime_ms);
  const title = currentTitle?.name || '?';
  const lv = gameState.is_in_hub ? `${t('hubLevel')}${hubLevel}` : `Lv.${gameState.level}`;
  const sc = currentScenario?.nameCN || (gameState.is_in_hub ? t('statusHub') : '?');
  try { await window.electron.invoke('update-tooltip', { text: `${gameState.player_name} | ${sc}\n${lv} | ${title} | ${rt}` }); } catch (e) {}
}

// ── Debug ──
const onboardingModal = document.getElementById('onboarding-modal');
const onboardingInput = document.getElementById('onboarding-name');
const onboardingOk = document.getElementById('onboarding-ok');
onboardingOk.addEventListener('click', async () => {
  const n = onboardingInput.value.trim();
  if (n) { try { await window.electron.invoke('set-player-name', { name: n }); if (gameState) gameState.player_name = n; } catch {} }
  onboardingModal.classList.add('hidden');
  window.electron.invoke('set-onboarding-seen').catch(() => {});
  renderHubView(); renderHubCards(); updateUI();
});

const debugPanel = document.getElementById('debug-panel'), debugContent = document.getElementById('debug-content'), debugClose = document.getElementById('debug-close');
debugClose.addEventListener('click', () => debugPanel.classList.add('hidden'));
document.getElementById('dbg-event').addEventListener('click', async () => {
  const r = await window.electron.invoke('dev-force-trigger-event').catch(()=>null);
  if (r) addLog('event', r.text || r.info);
});
document.getElementById('dbg-levelup').addEventListener('click', async () => {
  const r = await window.electron.invoke('dev-level-up', { levels: 10 }).catch(()=>null);
  if (r) addLog('levelup', `[DEV] 升级至 Lv.${r.level} ${r.title||''}`);
});
document.getElementById('dbg-achievement').addEventListener('click', async () => {
  const r = await window.electron.invoke('dev-achievement').catch(()=>null);
  if (r) addLog('achievement', `[DEV] ${r.name || r.info || '无'}`);
});
document.getElementById('dbg-runtime').addEventListener('click', async () => {
  await window.electron.invoke('dev-runtime', { hours: 1 }).catch(()=>{});
  addLog('system', '[DEV] +1h 运行时长');
});
document.getElementById('dbg-holiday').addEventListener('click', async () => {
  const r = await window.electron.invoke('dev-force-holiday-event').catch(()=>null);
  if (r) addLog('event', `[节日] ${r.holiday}: ${r.text}`);
});
document.getElementById('dbg-story').addEventListener('click', async () => {
  const r = await window.electron.invoke('dev-trigger-story').catch(()=>null);
  if (r) addLog('event', `[story] ${r.text}`);
  else addLog('system', '[story] 无可用 story 事件');
});
document.getElementById('dbg-filler').addEventListener('click', async () => {
  const r = await window.electron.invoke('dev-trigger-filler').catch(()=>null);
  if (r) addLog('event', `[filler] ${r.text}`);
  else addLog('system', '[filler] 无可用 filler 事件');
});
document.getElementById('dbg-reset-daily').addEventListener('click', async () => {
  await window.electron.invoke('dev-reset-daily').catch(()=>{});
  addLog('system', '[DEV] 每日状态已重置');
});
document.getElementById('dbg-chime').addEventListener('click', async () => {
  await window.electron.invoke('dev-hourly-chime').catch(()=>{});
  addLog('system', '[DEV] 整点报时');
});
document.getElementById('dbg-reset-save').addEventListener('click', async () => {
  if (confirm('确定要重置存档吗？此操作不可逆。')) {
    await window.electron.invoke('dev-reset-save').catch(()=>{});
  }
});
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    if (debugPanel.classList.contains('hidden')) {
      const state = { is_in_hub: gameState?.is_in_hub, hubLevel, lv: gameState?.level, totalExp: gameState?.total_exp_earned, runtime: formatRuntime(gameState?.total_runtime_ms || 0), equippedIdx: gameState?.equipped_title_index, title: currentTitle?.name, scenarioId: gameState?.scenario_id, language: gameState?.language, achievements: gameState?.unlockedAchievements?.length, events: gameState?.triggered_events?.length, logCount: logArea?.children?.length || 0, scenarios: scenarioList?.length || 0, winSize: `${window.innerWidth}×${window.innerHeight}` };
      debugContent.textContent = JSON.stringify(state, null, 2);
      debugPanel.classList.remove('hidden');
    } else { debugPanel.classList.add('hidden'); }
  }
});

bindCt('ct-fg'); bindCt('ct-bg'); bindCt('ct-dim'); bindCt('ct-border');

init().then(() => {
  document.title = `Idel-DreamMaker v${appVersion}`; applyTheme(gameState?.selected_font_theme || 'green');
  if (gameState?.is_in_hub) addLog('system', `Idel-DreamMaker v${appVersion} ${t('logStartHub')}`);
  else if (gameState) { switchView(false); addLog('info', tf('logStartScenario', formatRuntime(gameState.total_runtime_ms), gameState.level)); }
  updateUI(); updateTooltip(); setInterval(updateTooltip, 5000);

  // Load today's events from persistence
  const today = `${new Date().getFullYear()}-${pad(new Date().getMonth()+1)}-${pad(new Date().getDate())}`;
  window.electron.invoke('get-log-entries', { date: today }).then(entries => {
    if (entries && entries.length > 0) {
      entries.forEach(e => {
        const entry = document.createElement('div'); entry.className = `log-entry ${e.ty || 'event'}`;
        const ts = document.createElement('span'); ts.className = 'ts';
        ts.textContent = `[${e.t}]`;
        const msg = document.createElement('span'); msg.className = 'msg'; msg.textContent = e.m;
        entry.appendChild(ts); entry.appendChild(msg); logArea.appendChild(entry);
      });
      logArea.scrollTop = logArea.scrollHeight;
    }
  }).catch(() => {});
});
