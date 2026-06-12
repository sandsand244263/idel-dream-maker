// IPC via window.electron (provided by preload.cjs)

const LANG = {
  zh: {
    hubWelcome: '欢迎回来', hubLevel: '大厅 Lv.', drawBtn: '+ 抽取副本',
    drawPrompt: '抽到「{0}」— 输入该副本内的名称（留空用默认）',
    enterPrompt: '进入「{0}」— 输入该副本内的名称（留空用默认）',
    btnMini: '迷你', btnBack: '返回大厅', btnScenario: '副本', btnTitles: '称号',
    btnStatus: '状态', btnSettings: '设置', btnHide: '隐藏',
    panelScenario: '副本选择', panelTitles: '称号一览', panelSettings: '设置', panelAbout: '状态',
    labelVersion: '版本', labelPlayer: '玩家', labelScenario: '副本', labelLevel: '等级',
    labelHubLevel: '大厅等级', labelTitle: '称号', labelRuntime: '时长', labelAchievement: '成就',
    labelName: '名称', labelTheme: '主题', labelLanguage: '界面语言', labelAILanguage: 'AI 语言',
    btnSave: '保存', eventHeader: '事件', achievementHeader: '成就解锁',
    hubTitleEmpty: '尚无解锁称号', systemLoaded: '加载完成', systemInitFail: '初始化失败',
    systemEnterFail: '进入副本失败', systemDrawFail: '抽取失败', systemBackFail: '返回失败',
    systemLevelUp: '等级 {0}！{1}',
    systemEntered: '进入: {0}', systemDrew: '抽到并进入: {0}', systemBack: '返回大厅 — 大厅 Lv.{0}',
    logStartHub: 'Idel-DreamMaker v0.3.5 启动完成',
    logStartScenario: '已挂机 {0}，等级 {1}',
    scenarioEvent: '事件', scenarioAchievement: '成就', statusHub: '（大厅）', statusNone: '-',
    aliasTitle: '进入副本', aliasPlaceholder: '输入名称（留空用默认）',
    aliasCancel: '取消', aliasConfirm: '进入',
    noScenarios: '暂无可用的副本',
  },
  en: {
    hubWelcome: 'Welcome back', hubLevel: 'Hub Lv.', drawBtn: '+ Draw Scenario',
    drawPrompt: 'Drew "{0}" — Enter a name (leave empty for default)',
    enterPrompt: 'Enter "{0}" — Enter a name (leave empty for default)',
    btnMini: 'Mini', btnBack: 'Back to Hub', btnScenario: 'Scenarios', btnTitles: 'Titles',
    btnStatus: 'Status', btnSettings: 'Settings', btnHide: 'Hide',
    panelScenario: 'Scenarios', panelTitles: 'Titles', panelSettings: 'Settings', panelAbout: 'Status',
    labelVersion: 'Version', labelPlayer: 'Player', labelScenario: 'Scenario', labelLevel: 'Level',
    labelHubLevel: 'Hub Level', labelTitle: 'Title', labelRuntime: 'Runtime', labelAchievement: 'Achievements',
    labelName: 'Name', labelTheme: 'Theme', labelLanguage: 'Language', labelAILanguage: 'AI Language',
    btnSave: 'Save', eventHeader: 'Event', achievementHeader: 'Achievement',
    hubTitleEmpty: 'No titles yet', systemLoaded: 'Ready', systemInitFail: 'Init failed',
    systemEnterFail: 'Failed to enter', systemDrawFail: 'Draw failed', systemBackFail: 'Failed to return',
    systemLevelUp: 'Level {0}! {1}',
    systemEntered: 'Entered: {0}', systemDrew: 'Drew & entered: {0}', systemBack: 'Back to Hub — Hub Lv.{0}',
    logStartHub: 'Idel-DreamMaker v0.3.5 ready',
    logStartScenario: 'Running {0}, level {1}',
    scenarioEvent: 'Events', scenarioAchievement: 'Achievements', statusHub: '(Hub)', statusNone: '-',
    aliasTitle: 'Enter Scenario', aliasPlaceholder: 'Enter a name (leave empty for default)',
    aliasCancel: 'Cancel', aliasConfirm: 'Enter',
    noScenarios: 'No scenarios available',
  },
};

function t(key) { const l = gameState?.language || 'zh'; return LANG[l]?.[key] ?? LANG.zh[key] ?? key; }
function tf(key, ...args) { let s = t(key); args.forEach((a, i) => { s = s.replace(`{${i}}`, String(a)); }); return s; }

let gameState = null, scenarioList = [], currentScenario = null, currentTitle = null, hubLevel = 1;
let eventDismissTimer = null, achievementDismissTimer = null;
let isMiniMode = false;
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
const settingsTheme = document.getElementById('settings-theme');
const settingsLanguage = document.getElementById('settings-language');
const settingsAILanguage = document.getElementById('settings-ai-language');
const titlesPanel = document.getElementById('titles-panel');
const titlesClose = document.getElementById('titles-close');
const titlesListEl = document.getElementById('titles-list');
const btnBackHub = document.getElementById('btn-backhub');
const btnMini = document.getElementById('btn-mini');
const btnScenario = document.getElementById('btn-scenario');
const btnTitles = document.getElementById('btn-titles');
const btnSettings = document.getElementById('btn-settings');
const btnHide = document.getElementById('btn-hide');
const permaStatus = document.getElementById('perma-status');

const miniBar = document.getElementById('mini-bar');
const miniExpand = document.getElementById('mini-expand');
const miniCollapse = document.getElementById('mini-collapse');
const miniClose = document.getElementById('mini-close');
const miniId = document.getElementById('mini-id');
const miniLevel = document.getElementById('mini-level');
const miniTitle = document.getElementById('mini-title');
const miniPct = document.getElementById('mini-pct');
const miniFill = document.getElementById('mini-progress-fill');

const aliasModal = document.getElementById('alias-modal');
const aliasTitle = document.getElementById('alias-title');
const aliasDesc = document.getElementById('alias-desc');
const aliasInput = document.getElementById('alias-input');
const aliasCancel = document.getElementById('alias-cancel');
const aliasConfirm = document.getElementById('alias-confirm');
let aliasResolver = null;

// ── Titlebar ──
document.getElementById('titlebar-drag').addEventListener('mousedown', (e) => {
  if (e.target.closest('#titlebar-btns')) return;
  window.electron.invoke('start-dragging').catch(() => {});
});
document.getElementById('btn-close').addEventListener('click', () => { window.electron.invoke('hide-window').catch(() => {}); });

// ── Alias Modal ──
function showAliasModal(sn) {
  return new Promise((resolve) => {
    aliasTitle.textContent = t('aliasTitle'); aliasDesc.textContent = tf('enterPrompt', sn);
    aliasInput.placeholder = t('aliasPlaceholder'); aliasCancel.textContent = t('aliasCancel');
    aliasConfirm.textContent = t('aliasConfirm'); aliasInput.value = '';
    aliasModal.classList.remove('hidden'); aliasResolver = resolve;
    setTimeout(() => aliasInput.focus(), 100);
  });
}
aliasCancel.addEventListener('click', () => { aliasModal.classList.add('hidden'); if (aliasResolver) { aliasResolver(null); aliasResolver = null; } });
aliasConfirm.addEventListener('click', () => { aliasModal.classList.add('hidden'); if (aliasResolver) { aliasResolver(aliasInput.value.trim() || ''); aliasResolver = null; } });
aliasInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') aliasConfirm.click(); if (e.key === 'Escape') aliasCancel.click(); });

// ── Mini Bar ──
miniExpand.addEventListener('click', async () => { try { await window.electron.invoke('set-window-mode', { mode: 'full' }); } catch (e) {} isMiniMode = false; document.getElementById('app').classList.remove('hidden'); miniBar.classList.add('hidden'); });
miniCollapse.addEventListener('click', () => { window.electron.invoke('hide-window').catch(() => {}); });
miniClose.addEventListener('click', () => { window.electron.invoke('hide-window').catch(() => {}); });

let dragging = false;
miniBar.addEventListener('mousedown', (e) => {
  if (e.target.tagName === 'BUTTON') return;
  dragging = true; const r = miniBar.getBoundingClientRect(); const ox = e.clientX - r.left, oy = e.clientY - r.top;
  const mh = (ev) => { if (!dragging) return; window.electron.invoke('set-window-position', { x: ev.screenX - ox, y: ev.screenY - oy }).catch(() => {}); };
  const uh = () => { dragging = false; document.removeEventListener('mousemove', mh); document.removeEventListener('mouseup', uh); };
  document.addEventListener('mousemove', mh); document.addEventListener('mouseup', uh);
});

function updateMiniBar() {
  if (!gameState || !isMiniMode) return;
  miniId.textContent = `ID:${gameState.player_name}`; miniLevel.textContent = gameState.is_in_hub ? `Lv.${hubLevel}` : `Lv.${gameState.level}`;
  miniTitle.textContent = currentTitle?.name || '?';
  const t = gameState.total_exp_earned || 0, nr = calcExpForLevel(gameState.level + 1), cr = calcExpForLevel(gameState.level);
  const pct = nr > cr ? Math.min(100, ((t - cr) / (nr - cr)) * 100) : 0;
  miniPct.textContent = `${Math.round(pct)}%`; miniFill.style.width = `${pct}%`;
}
async function switchToMini() { try { await window.electron.invoke('set-window-mode', { mode: 'mini' }); } catch (e) {} isMiniMode = true; document.getElementById('app').classList.add('hidden'); miniBar.classList.remove('hidden'); updateMiniBar(); }
btnMini.addEventListener('click', () => switchToMini());

function getTitleByIndex(idx) {
  if (!currentScenario?.titles) return null;
  const t = currentScenario.titles[idx]; return t ? { name: t.name, color: t.color, desc: t.desc } : null;
}

async function init() {
  try {
    const full = await window.electron.invoke('get-full-state');
    gameState = full.game; currentScenario = full.scenario; currentTitle = full.currentTitle;
    hubLevel = full.hubLevel || 1; scenarioList = await window.electron.invoke('get-scenario-list');
  } catch (e) { addLog('system', `${t('systemInitFail')}: ${e}`); }
  updateUI(); renderHubView(); switchView(gameState?.is_in_hub !== false);
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
      updateUI(); updateMiniBar();
    }
  });
  window.electron.on('event-triggered', (event) => { addLog('event', event.text); showEventOverlay(event.title, event.color, event.text); });
  window.electron.on('level-up', (event) => { currentTitle = { name: event.title, color: event.titleColor, desc: event.titleDesc }; addLog('levelup', tf('systemLevelUp', event.level, event.title)); updateUI(); updateMiniBar(); });
  window.electron.on('achievement-unlocked', (event) => { const { name, desc, icon } = event; addLog('achievement', `${name}: ${desc}`); showAchievementOverlay(icon, name, desc); gameState?.unlockedAchievements.push(event.id); updateUI(); });
  window.electron.on('scenario-changed', (event) => { gameState = event.game; currentScenario = event.scenario; currentTitle = { name: event.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); });
}

function switchView(inHub) {
  hubView.classList.toggle('hidden', !inHub); logArea.classList.toggle('hidden', inHub);
  btnBackHub.classList.toggle('hidden', inHub); btnScenario.classList.toggle('hidden', inHub);
}

function calcLevel(exp) { return exp <= 0 ? 1 : Math.floor(Math.sqrt(exp / 100)) + 1; }
function calcExpForLevel(level) { if (level <= 1) return 0; return 100 * (level - 1) * (level - 1); }
function formatRuntime(ms) { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; return `${h}h${m}m${sec}s`; }
function pad(n) { return n.toString().padStart(2, '0'); }

// ── Hub View ──
function renderHubView() {
  if (!gameState) return;
  hubGreeting.textContent = t('hubWelcome'); hubPlayerName.textContent = gameState.player_name;
  hubLevelDisplay.textContent = `${t('hubLevel')}${hubLevel}`; hubDrawBtn.textContent = t('drawBtn');
  hubScenarioList.innerHTML = '';
  if (!scenarioList || scenarioList.length === 0) {
    hubScenarioList.innerHTML = `<div class="hub-card" style="border-style:dashed;cursor:default"><div class="hub-card-name" style="color:var(--dim)">${t('noScenarios')}</div></div>`;
    return;
  }
  scenarioList.forEach(s => {
    const card = document.createElement('div'); card.className = 'hub-card';
    card.innerHTML = `<div class="hub-card-name">${s.nameCN} (${s.name})</div><div class="hub-card-desc">${s.description}</div><div class="hub-card-meta">${s.eventCount} ${t('scenarioEvent')} · ${s.achievementCount} ${t('scenarioAchievement')}</div>`;
    card.addEventListener('click', async () => {
      const alias = await showAliasModal(s.nameCN); if (alias === null) return;
      try { const r = await window.electron.invoke('select-scenario', { id: s.id, alias }); gameState = r.game; currentScenario = r.scenario; currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); updateUI(); updateMiniBar(); } catch (e) { addLog('system', t('systemEnterFail')); }
    });
    hubScenarioList.appendChild(card);
  });
}

hubDrawBtn.addEventListener('click', async () => {
  try { const s = await window.electron.invoke('draw-scenario'); if (!s) return; const alias = await showAliasModal(s.nameCN); if (alias === null) return; const r = await window.electron.invoke('select-scenario', { id: s.id, alias }); gameState = r.game; currentScenario = r.scenario; currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemDrew', currentScenario.nameCN)); updateUI(); updateMiniBar(); } catch (e) { addLog('system', t('systemDrawFail')); }
});

btnBackHub.addEventListener('click', async () => {
  try { const r = await window.electron.invoke('exit-to-hub'); gameState.hub_total_exp = r.hubTotalExp; hubLevel = r.hubLevel; gameState.is_in_hub = true; switchView(true); renderHubView(); addLog('info', tf('systemBack', hubLevel)); updateUI(); lastRuntime = 0; } catch (e) { addLog('system', t('systemBackFail')); }
});

// ── UI ──
function updateUI() {
  if (!gameState) return;
  const dl = gameState.is_in_hub ? hubLevel : gameState.level;
  const ct = currentTitle || (currentScenario?.titles && currentScenario.titles[gameState.equipped_title_index || 0]);
  titlebarId.textContent = `ID:${gameState.player_name}`; titlebarLv.textContent = `LV:${dl}`;
  if (ct) { titlebarTitle.textContent = ct.name; titlebarTitle.style.color = ct.color || '#888'; }
  updatePermaStatus();
}

function updatePermaStatus() {
  if (!gameState) { permaStatus.innerHTML = ''; return; }
  const rt = gameState.is_in_hub ? '—' : formatRuntime(gameState.total_runtime_ms || 0);
  const ach = gameState.unlockedAchievements?.length || 0;
  const dl = gameState.is_in_hub ? `Hub Lv.${hubLevel}` : `Lv.${gameState.level}`;
  const sc = currentScenario?.nameCN || 'Hub';
  permaStatus.innerHTML = `v0.3.6 | ${gameState.player_name} | ${sc}<br>${dl} | ${currentTitle?.name || '?'} | ${rt} | 成就:${ach}`;
}

function addLog(type, message) {
  const prev = logArea.querySelector('.log-entry.latest');
  if (prev) prev.classList.remove('latest');

  const entry = document.createElement('div'); entry.className = `log-entry ${type} latest`;
  const ts = document.createElement('span'); ts.className = 'ts';
  const now = new Date(); ts.textContent = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
  const msg = document.createElement('span'); msg.className = 'msg'; msg.textContent = message;
  entry.appendChild(ts); entry.appendChild(msg); logArea.appendChild(entry);
  if (logArea.children.length > 500) logArea.removeChild(logArea.firstChild);
  logArea.scrollTop = logArea.scrollHeight;
}

function showEventOverlay(title, color, text) {
  if (eventDismissTimer) clearTimeout(eventDismissTimer);
  eventTitle.textContent = title; eventTitle.style.color = color; eventText.textContent = text;
  eventOverlay.classList.remove('hidden'); eventDismissTimer = setTimeout(() => eventOverlay.classList.add('hidden'), 6000);
}
eventOverlay.addEventListener('click', () => { eventOverlay.classList.add('hidden'); if (eventDismissTimer) clearTimeout(eventDismissTimer); });

function showAchievementOverlay(icon, name, desc) {
  if (achievementDismissTimer) clearTimeout(achievementDismissTimer);
  achievementIcon.textContent = icon; achievementName.textContent = name; achievementDesc.textContent = desc;
  achievementOverlay.classList.remove('hidden'); achievementDismissTimer = setTimeout(() => achievementOverlay.classList.add('hidden'), 8000);
}
achievementOverlay.addEventListener('click', () => { achievementOverlay.classList.add('hidden'); if (achievementDismissTimer) clearTimeout(achievementDismissTimer); });

btnScenario.addEventListener('click', async () => { try { scenarioList = await window.electron.invoke('get-scenario-list'); } catch (e) { addLog('system', `获取副本列表失败: ${e}`); } renderScenarioPanel(); scenarioPanel.classList.remove('hidden'); });
btnTitles.addEventListener('click', () => { renderTitlesPanel(); titlesPanel.classList.remove('hidden'); });
btnSettings.addEventListener('click', () => { settingsName.value = gameState?.player_name || ''; settingsTheme.value = gameState?.selected_font_theme || 'green'; settingsLanguage.value = gameState?.language || 'zh'; settingsAILanguage.value = gameState?.ai_output_language || 'zh'; settingsPanel.classList.remove('hidden'); });
settingsClose.addEventListener('click', () => settingsPanel.classList.add('hidden'));
settingsNameSave.addEventListener('click', async () => { const n = settingsName.value.trim(); if (!n) return; try { await window.electron.invoke('set-player-name', { name: n }); if (gameState) gameState.player_name = n; renderHubView(); updateUI(); } catch (e) { addLog('system', `保存名称失败: ${e}`); } });
settingsTheme.addEventListener('change', async () => { const v = settingsTheme.value; try { await window.electron.invoke('set-font-theme', { theme: v }); if (gameState) gameState.selected_font_theme = v; applyTheme(v); } catch (e) { addLog('system', `切换主题失败: ${e}`); } });
settingsLanguage.addEventListener('change', async () => { const v = settingsLanguage.value; try { await window.electron.invoke('set-language', { lang: v }); if (gameState) gameState.language = v; applyLanguage(); renderHubView(); } catch (e) { addLog('system', `切换语言失败: ${e}`); } });
settingsAILanguage.addEventListener('change', async () => { const v = settingsAILanguage.value; try { await window.electron.invoke('set-ai-output-language', { lang: v }); if (gameState) gameState.ai_output_language = v; } catch (e) { addLog('system', `切换 AI 语言失败: ${e}`); } });
btnHide.addEventListener('click', () => { window.electron.invoke('hide-window').catch(() => {}); });

function applyTheme(id) { document.documentElement.className = `theme-${id}`; }
function applyLanguage() { document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); }); }

function renderScenarioPanel() {
  scenarioListEl.innerHTML = ''; const cid = gameState?.scenario_id;
  scenarioList.forEach(s => {
    const card = document.createElement('div'); card.className = `scenario-card${s.id === cid ? ' active' : ''}`;
    card.innerHTML = `<div class="scenario-name" style="color:${s.id === cid ? '#0F0' : '#888'}">${s.nameCN} (${s.name})</div><div class="scenario-desc">${s.description}</div><div class="scenario-stats"><span>${s.eventCount} ${t('scenarioEvent')}</span><span>${s.achievementCount} ${t('scenarioAchievement')}</span></div>`;
    card.addEventListener('click', async () => { const alias = await showAliasModal(s.nameCN); if (alias === null) return; try { const r = await window.electron.invoke('select-scenario', { id: s.id, alias }); gameState = r.game; currentScenario = r.scenario; currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); scenarioPanel.classList.add('hidden'); updateUI(); updateMiniBar(); } catch (e) { addLog('system', t('systemEnterFail')); } });
    scenarioListEl.appendChild(card);
  });
}
scenarioClose.addEventListener('click', () => scenarioPanel.classList.add('hidden'));
titlesClose.addEventListener('click', () => titlesPanel.classList.add('hidden'));

async function renderTitlesPanel() {
  titlesListEl.innerHTML = '';
  if (gameState?.is_in_hub) {
    try { const ht = await window.electron.invoke('get-hub-titles'); ht.forEach(s => { const g = document.createElement('div'); g.className = 'hub-title-group'; const sm = document.createElement('div'); sm.className = 'hub-title-summary'; sm.innerHTML = `▶ <span class="hub-title-scenario">${s.nameCN}</span> <span class="hub-title-count">${s.unlockedCount}/${s.totalCount}</span>`; const bd = document.createElement('div'); bd.className = 'hub-title-body hidden'; (s.unlockedTitles.length ? s.unlockedTitles : [t('hubTitleEmpty')]).forEach(n => { const it = document.createElement('div'); it.className = 'title-item'; it.innerHTML = `<span class="title-name" style="color:var(--fg);font-size:12px">${n}</span>`; bd.appendChild(it); }); sm.addEventListener('click', () => { bd.classList.toggle('hidden'); sm.innerHTML = bd.classList.contains('hidden') ? `▶ <span class="hub-title-scenario">${s.nameCN}</span> <span class="hub-title-count">${s.unlockedCount}/${s.totalCount}</span>` : `▼ <span class="hub-title-scenario">${s.nameCN}</span> <span class="hub-title-count">${s.unlockedCount}/${s.totalCount}</span>`; }); g.appendChild(sm); g.appendChild(bd); titlesListEl.appendChild(g); }); } catch (e) { addLog('system', `获取大厅称号失败: ${e}`); } return;
  }
  try { const d = await window.electron.invoke('get-scenario-detail', { id: gameState?.scenario_id }); const cur = gameState?.equipped_title_index ?? 0; d.titles.forEach((t, idx) => { const u = t.level <= gameState.level; const eq = u && idx === cur; const it = document.createElement('div'); it.className = `title-item${u ? '' : ' locked'}${eq ? ' equipped' : ''}`; it.innerHTML = `<span class="title-level">Lv.${t.level}</span><span class="title-name" style="color:${u ? t.color : 'var(--dim)'}">${u ? t.name : '???'}</span><span class="title-desc">${u ? t.desc : '???'}</span>`; if (u) { it.style.cursor = 'pointer'; it.addEventListener('click', async () => { try { await window.electron.invoke('set-title', { index: idx }); if (gameState) gameState.equipped_title_index = idx; currentTitle = { name: t.name, color: t.color, desc: t.desc }; updateUI(); updateMiniBar(); renderTitlesPanel(); } catch (e) { addLog('system', `佩戴称号失败: ${e}`); } }); } titlesListEl.appendChild(it); }); } catch (e) { addLog('system', `获取副本详情失败: ${e}`); }
}

async function updateTooltip() {
  if (!gameState) return;
  const rt = formatRuntime(gameState.total_runtime_ms);
  const title = currentTitle?.name || '?';
  const lv = gameState.is_in_hub ? `大厅 Lv.${hubLevel}` : `Lv.${gameState.level}`;
  const sc = currentScenario?.nameCN || (gameState.is_in_hub ? '大厅' : '?');
  try { await window.electron.invoke('update-tooltip', { text: `${gameState.player_name} | ${sc}\n${lv} | ${title} | ${rt}` }); } catch (e) {}
}

// ── Debug ──
const debugPanel = document.getElementById('debug-panel'), debugContent = document.getElementById('debug-content'), debugClose = document.getElementById('debug-close');
debugClose.addEventListener('click', () => debugPanel.classList.add('hidden'));
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    if (debugPanel.classList.contains('hidden')) {
      const state = { is_in_hub: gameState?.is_in_hub, isMiniMode, hubLevel, lv: gameState?.level, totalExp: gameState?.total_exp_earned, runtime: formatRuntime(gameState?.total_runtime_ms || 0), equippedIdx: gameState?.equipped_title_index, title: currentTitle?.name, scenarioId: gameState?.scenario_id, language: gameState?.language, achievements: gameState?.unlockedAchievements?.length, events: gameState?.triggered_events?.length, logCount: logArea?.children?.length || 0, scenarios: scenarioList?.length || 0, winSize: `${window.innerWidth}×${window.innerHeight}` };
      debugContent.textContent = JSON.stringify(state, null, 2);
      debugPanel.classList.remove('hidden');
    } else { debugPanel.classList.add('hidden'); }
  }
});

init().then(() => {
  document.title = 'Idel-DreamMaker'; applyTheme(gameState?.selected_font_theme || 'green');
  if (gameState?.is_in_hub) addLog('system', t('logStartHub'));
  else if (gameState) { switchView(false); addLog('info', tf('logStartScenario', formatRuntime(gameState.total_runtime_ms), gameState.level)); }
  updateUI(); updateTooltip(); setInterval(updateTooltip, 5000);
});
