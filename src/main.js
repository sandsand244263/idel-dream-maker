// IPC via window.electron (provided by preload.cjs)

const LANG = {
  hubWelcome: '欢迎回来', hubLevel: '大厅 Lv.',
  noScenarios: '暂无可用的副本', hubEmptyHint: '点击下方 [副本] 选择一个故事世界',
  btnBack: '大厅', btnScenario: '副本', btnJourney: '历程',
  btnSettings: '设置', btnTutorial: '教程',
  jTitle: '称号', jAchievement: '成就', jEvent: '事件', jStats: '按键',
  panelScenario: '副本选择', panelTitles: '称号一览', panelAchievement: '成就一览', panelEvent: '事件记录', panelStats: '按键统计', panelSettings: '设置',
  labelName: '名称',
  settingsSave: '保存', settingsThemeTitle: '主题', ctSave: '应用自定义配色',
  eventHeader: '事件', achievementHeader: '成就解锁',
  systemInitFail: '初始化失败', systemEnterFail: '进入副本失败',
  systemBackFail: '返回失败',
  systemLevelUp: '等级 {0}！{1}',
  systemEntered: '进入: {0}', systemBack: '返回大厅 — 大厅 Lv.{0}',
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
  obHow: '如何开始：',   obStep1: '点击 [副本] 选择一个故事世界',
  obStep2: '进入后自动挂机，经验随时间增长', obStep3: '升级解锁称号，随机弹出故事事件',
  obStep4: '随时点击 [大厅] 退出，经验累入全局等级',
  obTip: '提示：宠物窗口常驻桌面，点击宠物可交互',
  obName: '你的名称', obNamePlaceholder: '输入名称', obStart: '开始冒险',
  btnOpenScenariosFolder: '打开副本文件夹',
  btnRefreshScenarios: '刷新副本列表',
  scenariosFolderHint: '将 .md 副本文件放入打开的文件夹，点「刷新」即可自动加载',
  labelUserMade: '自制',
  statusHub: '（大厅）', statusNone: '-',
  eventToday: '今天',
  eventDate: '{0}月{1}日',
  jEnding: '结局',
  endingHeader: '旅程已达终点',
  endingRebirth: '重新开始（重生）',
  endingHub: '返回大厅',
  endingPanel: '结局收藏',
  endingEmpty: '暂无通关记录',
  endingRecord: '{0} · {1}周目 · {2}',
  hubCompletion: '通关 {0}/{1}',
  hubTitleGroup: '大厅称号',
  completionTitleGroup: '通关称号',
  completionTitleEmpty: '暂无通关称号',
  scenarioTitleGroup: '副本称号',
  hubAchGroup: '大厅成就',
  scenarioAchGroup: '副本成就',
  scenarioLocked: '需要大厅 Lv.{0} 或通关 {1} 个副本',
  rebirthConfirm: '确定重生吗？该副本进度将清空，你将重新体验所有故事。经验加成 +10%（封顶 +50%），filler 上限 +5（封顶 +25）。',
  archivedLabel: '已归档',
  restoreBtn: '恢复',
  scenarioArchived: '已归档',
  archiveFail: '归档失败',
  archiveAllDone: '所有副本都已通关',
  archivePromptAction: '反馈与催更',
  feedbackTitle: '反馈与支持',
  openGitHub: '在 GitHub 提交 Issue',
  feedbackHint: '提交 Issue 时附上日志文件有助于排查问题',
  feedbackExportBtn: '导出日志到桌面',
  feedbackOpenFolder: '打开日志文件夹',
  feedbackExporting: '正在导出...',
  feedbackExported: '已导出到桌面',
  feedbackExportFail: '导出失败',
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
const hubTitleDisplay = document.getElementById('hub-title-display');
const hubCompletionDisplay = document.getElementById('hub-completion-display');
const endingOverlay = document.getElementById('ending-overlay');
const endingScenarioName = document.getElementById('ending-scenario-name');
const endingText = document.getElementById('ending-text');
const endingRebirthBtn = document.getElementById('ending-rebirth');
const endingHubBtn = document.getElementById('ending-hub');
const endingPanel = document.getElementById('ending-panel');
const endingPanelClose = document.getElementById('ending-panel-close');
const endingPanelList = document.getElementById('ending-panel-list');
const statsPanel = document.getElementById('stats-panel');
const statsClose = document.getElementById('stats-close');
const statsListEl = document.getElementById('stats-list');

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
      if (p.hub_title) currentTitle = { name: p.hub_title, color: '#FFD700', desc: '' };
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
    if (event.eventText) {
      showEventOverlay(`Lv.${event.level} — ${event.title || ''}`, event.titleColor || '#FFA500', event.eventText);
    }
    if (titlebarLv) {
      titlebarLv.classList.remove('titlebar-lv-flash');
      void titlebarLv.offsetWidth;
      titlebarLv.classList.add('titlebar-lv-flash');
    }
    updateUI();
  });
  window.electron.on('achievement-unlocked', (event) => { const { name, desc, icon } = event; addLog('achievement', `${name}: ${desc}`); showAchievementOverlay(icon, name, desc); updateUI(); });
  window.electron.on('scenario-changed', (event) => { gameState = event.game; currentScenario = event.scenario; currentTitle = { name: event.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); updateUI(); });
  window.electron.on('auto-save', () => { flashSaveDot(); });
  window.electron.on('scenario-ending', (event) => {
    endingScenarioName.textContent = event.scenarioName;
    endingText.textContent = event.text;
    endingOverlay.classList.remove('hidden');
  });
}

endingRebirthBtn.addEventListener('click', async () => {
  const ok = await showConfirmModal(t('rebirthConfirm'));
  if (!ok) return;
  try {
    const r = await window.electron.invoke('rebirth-scenario', { scenarioId: gameState?.scenario_id });
    if (r.success) {
      gameState.is_in_hub = true;
      gameState.scenario_id = '';
      hubLevel = r.hubLevel;
      endingOverlay.classList.add('hidden');
      switchView(true);
      renderHubView();
      renderHubCards();
      updateUI();
      addLog('info', '已重生，经验加成 +10%');
    }
  } catch (e) { showToast('重生失败', 'error'); }
});
endingHubBtn.addEventListener('click', () => {
  endingOverlay.classList.add('hidden');
});
endingPanelClose.addEventListener('click', () => endingPanel.classList.add('hidden'));

function switchView(inHub) {
  hubView.classList.toggle('hidden', !inHub); logArea.classList.toggle('hidden', inHub);
  btnBackHub.classList.toggle('hidden', inHub); btnScenario.classList.toggle('hidden', inHub);
}

function calcLevel(exp) {
  if (exp <= 0) return 1;
  if (exp <= 980100) return Math.floor(Math.sqrt(exp / 100)) + 1;
  return 100 + Math.floor((exp - 980100) / 6000);
}
function calcExpForLevel(level) { if (level <= 1) return 0; if (level <= 100) return 100 * (level - 1) * (level - 1); return 980100 + (level - 100) * 6000; }
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
  hubLevelDisplay.textContent = `${t('hubLevel')}${hubLevel}`;
  // 加载大厅称号和通关统计
  window.electron.invoke('get-hub-stats').then(stats => {
    if (hubTitleDisplay) hubTitleDisplay.textContent = stats.hubTitle ? stats.hubTitle.name : '';
    if (hubCompletionDisplay) hubCompletionDisplay.textContent = tf('hubCompletion', stats.completionCount, stats.totalScenarios);
  }).catch(() => {});
}

function renderHubCards() {
  if (!scenarioList) return;
  hubScenarioList.innerHTML = '';
  if (!scenarioList || scenarioList.length === 0) {
    hubScenarioList.innerHTML = `<div class="hub-empty"><div class="hub-empty-icon">[ ~ ~ ]</div><div class="hub-empty-text">${t('noScenarios')}</div><div class="hub-empty-hint">${t('hubEmptyHint')}</div></div>`;
    return;
  }
  // 新手引导：未进过任何副本时显示
  const hasProgress = gameState?.scenario_progress && Object.keys(gameState.scenario_progress).length > 0;
  if (!hasProgress && gameState?.has_seen_onboarding) {
    const guide = document.createElement('div');
    guide.className = 'hub-guide';
    guide.textContent = '→ 点击下方[副本]开始你的第一个故事';
    hubScenarioList.appendChild(guide);
  }
  Promise.all([
    window.electron.invoke('get-archived-scenarios'),
    window.electron.invoke('get-scenario-unlocks')
  ]).then(([archivedIds, unlocks]) => {
    const unlockMap = {};
    unlocks.forEach(u => unlockMap[u.id] = u);
    const archivedSet = new Set(archivedIds || []);
    const activeList = scenarioList.filter(s => !archivedSet.has(s.id));
    const archivedList = scenarioList.filter(s => archivedSet.has(s.id));
    // 未归档卡片
    activeList.forEach(s => {
      const u = unlockMap[s.id] || { unlocked: true };
      const card = document.createElement('div');
      card.className = 'hub-card' + (u.unlocked ? '' : ' locked');
      let progressHtml = '';
      if (u.unlocked) {
        const progress = gameState?.scenario_progress?.[s.id];
        const completion = gameState?.gameCompletions?.find(c => c.scenarioId === s.id);
        const rebirthCount = gameState?.rebirthCounts?.[s.id] || 0;
        if (completion) {
          progressHtml = `<div class="hub-card-progress"><span class="progress-complete">✓ 通关</span>${rebirthCount > 0 ? `<span class="progress-rebirth">↻ R${rebirthCount}</span>` : ''}</div>`;
        } else if (progress) {
          const lvl = calcLevel(progress.totalExpEarned || progress.total_exp_earned || 0);
          progressHtml = `<div class="hub-card-progress"><span class="progress-level">Lv.${lvl}</span></div>`;
        }
      }
      const archiveBtn = (u.unlocked && u.canArchive) ? `<span class="archive-btn" data-sid="${s.id}">[归档]</span>` : '';
      const userTag = s.isUserMade ? `<span class="user-made-tag">${t('labelUserMade')}</span>` : '';
      card.innerHTML = `<div class="hub-card-name">${s.nameCN} (${s.name})${userTag}</div><div class="hub-card-desc">${s.description}</div><div class="hub-card-meta">${s.eventCount} ${t('scenarioEvent')} · ${s.achievementCount} ${t('scenarioAchievement')}</div>${progressHtml}${archiveBtn}${u.unlocked ? '' : `<div class="hub-card-lock">${tf('scenarioLocked', u.requirement.hub_level || 0, u.requirement.completions || 0)}</div>`}`;
      if (u.unlocked) {
        card.addEventListener('click', async (e) => {
          if (e.target.closest('.archive-btn')) return;
          try { const r = await window.electron.invoke('select-scenario', { id: s.id, alias: '' }); gameState = r.game; currentScenario = r.scenario; currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); updateUI(); } catch (e) { showToast(t('systemEnterFail'), 'error'); }
        });
        card.querySelector('.archive-btn')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          try { await window.electron.invoke('archive-scenario', { scenarioId: s.id }); renderHubCards(); showToast(t('scenarioArchived'), 'info'); } catch (e) { showToast(t('archiveFail'), 'error'); }
        });
      }
      hubScenarioList.appendChild(card);
    });
    // 已归档区域
    if (archivedList.length > 0) {
      const archSection = document.createElement('div');
      archSection.className = 'archived-section';
      const archHeader = document.createElement('div');
      archHeader.className = 'archived-header';
      archHeader.textContent = `─── ${t('archivedLabel')} (${archivedList.length}) ───`;
      const archListEl = document.createElement('div');
      archListEl.className = 'archived-list';
      archivedList.forEach(s => {
        const card = document.createElement('div');
        card.className = 'hub-card archived-card';
        const completion = gameState?.gameCompletions?.find(c => c.scenarioId === s.id);
        const rebirthCount = gameState?.rebirthCounts?.[s.id] || 0;
        let progHtml = '';
        if (completion) {
          progHtml = `<div class="hub-card-progress"><span class="progress-complete">✓ 通关</span>${rebirthCount > 0 ? `<span class="progress-rebirth">↻ R${rebirthCount}</span>` : ''}</div>`;
        }
        card.innerHTML = `<div class="hub-card-name">${s.nameCN} (${s.name})</div><div class="hub-card-desc">${s.description}</div>${progHtml}<span class="restore-btn" data-sid="${s.id}">[${t('restoreBtn')}]</span>`;
        card.querySelector('.restore-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          try { await window.electron.invoke('unarchive-scenario', { scenarioId: s.id }); renderHubCards(); } catch {}
        });
        archListEl.appendChild(card);
      });
      archSection.appendChild(archHeader);
      archSection.appendChild(archListEl);
      archHeader.addEventListener('click', () => { archListEl.classList.toggle('hidden'); });
      hubScenarioList.appendChild(archSection);
    }
    // 全部通关催更入口（T3 实现）
    renderAllCompletePrompt();
  }).catch(() => {
    // 降级：全部可点击，无归档
    scenarioList.forEach(s => {
      const card = document.createElement('div'); card.className = 'hub-card';
      let progressHtml = '';
      const progress = gameState?.scenario_progress?.[s.id];
      const completion = gameState?.gameCompletions?.find(c => c.scenarioId === s.id);
      const rebirthCount = gameState?.rebirthCounts?.[s.id] || 0;
      if (completion) {
        progressHtml = `<div class="hub-card-progress"><span class="progress-complete">✓ 通关</span>${rebirthCount > 0 ? `<span class="progress-rebirth">↻ R${rebirthCount}</span>` : ''}</div>`;
      } else if (progress) {
        const lvl = calcLevel(progress.totalExpEarned || progress.total_exp_earned || 0);
        progressHtml = `<div class="hub-card-progress"><span class="progress-level">Lv.${lvl}</span></div>`;
      }
      card.innerHTML = `<div class="hub-card-name">${s.nameCN} (${s.name})</div><div class="hub-card-desc">${s.description}</div><div class="hub-card-meta">${s.eventCount} ${t('scenarioEvent')} · ${s.achievementCount} ${t('scenarioAchievement')}</div>${progressHtml}`;
      card.addEventListener('click', async () => {
        try { const r = await window.electron.invoke('select-scenario', { id: s.id, alias: '' }); gameState = r.game; currentScenario = r.scenario; currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); updateUI(); } catch (e) { showToast(t('systemEnterFail'), 'error'); }
      });
      hubScenarioList.appendChild(card);
    });
  });
}

function renderAllCompletePrompt() {
  window.electron.invoke('get-all-complete-prompt').then(p => {
    if (!p.show) return;
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.innerHTML = `<div class="prompt-text">${t('archiveAllDone')}</div><div class="prompt-action" data-i18n="archivePromptAction">→ ${t('archivePromptAction')}</div>`;
    card.addEventListener('click', () => {
      openSettingsPanel();
      window.electron.invoke('dismiss-all-complete-prompt');
      card.remove();
    });
    hubScenarioList.appendChild(card);
  }).catch(() => {});
}

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
  const ach = gameState.unlockedAchievements?.length || 0;
  const rebirthCount = (gameState.rebirth_count || 0);
  if (gameState.is_in_hub) {
    if (permaText) permaText.textContent = `Hub Lv.${hubLevel} | ${currentTitle?.name || '?'}`;
  } else {
    const rt = formatRuntime(gameState.total_runtime_ms || 0);
    const dl = `Lv.${gameState.level}${rebirthCount > 0 ? `(R${rebirthCount})` : ''}`;
    const title = currentTitle?.name || '?';
    if (permaText) permaText.textContent = `${dl} | ${title} | ${rt} | 成就:${ach}`;
  }
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

// ── Stats Panel ──
async function renderStatsPanel() {
  try {
    const s = await window.electron.invoke('get-key-stats');
    const items = [
      `<div class="stats-row"><span class="stats-label">总按键</span><span class="stats-value">${(s.total || 0).toLocaleString()}</span></div>`,
      `<div class="stats-row"><span class="stats-label">今日按键</span><span class="stats-value">${(s.daily || 0).toLocaleString()}</span></div>`,
      `<div class="stats-row"><span class="stats-label">当前连击</span><span class="stats-value">${s.grade ? s.grade + ' ' + s.streak : '—'}</span></div>`,
      `<div class="stats-row"><span class="stats-label">达成段位</span><span class="stats-value">${s.milestones && s.milestones.length > 0 ? s.milestones.join(' · ') : '—'}</span></div>`,
    ];
    statsListEl.innerHTML = items.join('');
  } catch { statsListEl.innerHTML = '<div class="stats-row" style="color:var(--dim)">加载失败</div>'; }
}

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
    else if (action === 'ending') { renderEndingPanel(); endingPanel.classList.remove('hidden'); }
    else if (action === 'stats') { renderStatsPanel(); statsPanel.classList.remove('hidden'); }
  });
});
eventClose.addEventListener('click', () => eventPanel.classList.add('hidden'));
statsClose.addEventListener('click', () => statsPanel.classList.add('hidden'));

function openSettingsPanel() {
  refreshSyncStatus();
  // Sync auto-start checkbox
  window.electron.invoke('get-auto-start').then(r => {
    const cb = document.getElementById('chk-auto-start');
    if (cb) cb.checked = r.enabled;
  }).catch(() => {});
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
}
btnSettings.addEventListener('click', openSettingsPanel);
settingsClose.addEventListener('click', () => settingsPanel.classList.add('hidden'));
settingsNameSave.addEventListener('click', async () => { const n = settingsName.value.trim(); if (!n) return; try { await window.electron.invoke('set-player-name', { name: n }); if (gameState) gameState.player_name = n; renderHubView(); updateUI(); } catch (e) { showToast(t('systemEnterFail'), 'error'); } });
document.getElementById('btn-tutorial').addEventListener('click', async () => {
  if (onboardingInput) onboardingInput.value = gameState?.player_name || '';
  if (onboardingModal) onboardingModal.classList.remove('hidden');
});

// ── Auto-start ──
document.getElementById('chk-auto-start')?.addEventListener('change', async (e) => {
  try { await window.electron.invoke('set-auto-start', { enabled: e.target.checked }); } catch {}
});

// ── 版本更新 ──
async function proxyDownload() {
  const status = document.getElementById('update-status');
  const dlProxy = document.getElementById('btn-dl-proxy');
  dlProxy.textContent = '获取中...';
  dlProxy.disabled = true;
  try {
    const r = await window.electron.invoke('get-proxy-download');
    if (r.success) {
      window.electron.invoke('open-update-url', { url: r.url });
      status.textContent = '正在下载: ' + r.name;
      status.style.color = 'var(--fg)';
    } else {
      status.textContent = '获取下载链接失败: ' + (r.error || '');
      status.style.color = '#f44';
    }
  } catch { status.textContent = '获取下载链接失败'; status.style.color = '#f44'; }
  dlProxy.textContent = '国内加速下载';
  dlProxy.disabled = false;
}

document.getElementById('btn-check-update')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-check-update');
  const status = document.getElementById('update-status');
  const dlProxy = document.getElementById('btn-dl-proxy');
  btn.textContent = '检查中...';
  btn.disabled = true;
  status.textContent = '正在检查更新...';
  status.style.color = 'var(--dim)';
  try {
    const r = await window.electron.invoke('check-for-update');
    if (!r.success) {
      status.textContent = '检查失败: ' + (r.error || '网络错误');
      status.style.color = '#f44';
      dlProxy.classList.remove('hidden');
      dlProxy.onclick = proxyDownload;
      return;
    }
    if (r.hasUpdate) {
      status.innerHTML = '发现新版本: v' + r.latestVersion + ' &nbsp;<a href="#" id="update-dl-link" style="color:var(--fg);">GitHub 下载</a>';
      status.style.color = '#ff6';
      dlProxy.classList.remove('hidden');
      dlProxy.onclick = proxyDownload;
      document.getElementById('update-dl-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.electron.invoke('open-update-url', { url: r.downloadUrl });
      });
    } else {
      status.textContent = '已是最新版本 (v' + r.currentVersion + ')';
      status.style.color = '#6b6';
    }
  } catch {
    status.textContent = '检查失败';
    status.style.color = '#f44';
  }
  btn.textContent = '检查更新';
  btn.disabled = false;
});
// ── Auto-update listener ──
window.electron.on('update-status', (d) => {
  const status = document.getElementById('update-status');
  const btn = document.getElementById('btn-check-update');
  if (!status) return;
  if (d.type === 'checking') { status.textContent = '正在检查更新...'; status.style.color = 'var(--dim)'; }
  else if (d.type === 'available') { status.textContent = '发现 v' + d.version + '，正在自动下载...'; status.style.color = '#ff6'; }
  else if (d.type === 'not-available') { status.textContent = '已是最新版本'; status.style.color = '#6b6'; }
  else if (d.type === 'progress') { status.textContent = '下载中 ' + d.percent + '%'; status.style.color = 'var(--fg)'; btn.textContent = '下载中 ' + d.percent + '%'; }
  else if (d.type === 'downloaded') {
    status.innerHTML = '新版本已下载，<a href="#" id="btn-install-update" style="color:var(--fg);">立即重启安装</a>';
    status.style.color = '#6b6';
    btn.textContent = '立即重启';
    btn.onclick = () => window.electron.invoke('trigger-update');
    setTimeout(() => { document.getElementById('btn-install-update')?.addEventListener('click', (e) => { e.preventDefault(); window.electron.invoke('trigger-update'); }); }, 100);
  }
  else if (d.type === 'error') { status.textContent = '更新失败: ' + (d.message || '未知错误'); status.style.color = '#f44'; btn.textContent = '检查更新'; }
});

// ── 反馈面板 ──
document.getElementById('btn-github-repo')?.addEventListener('click', async () => {
  try { await window.electron.invoke('open-github-repo'); } catch {}
});
document.getElementById('btn-export-logs')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-export-logs');
  const origText = btn.textContent;
  btn.textContent = t('feedbackExporting');
  btn.disabled = true;
  try {
    const r = await window.electron.invoke('export-logs-to-desktop');
    if (r.success) {
      showToast(t('feedbackExported'), 'info');
    } else {
      showToast(t('feedbackExportFail'), 'error');
    }
  } catch { showToast(t('feedbackExportFail'), 'error'); }
  btn.textContent = origText;
  btn.disabled = false;
});
document.getElementById('btn-open-log-folder')?.addEventListener('click', async () => {
  try { await window.electron.invoke('open-log-folder'); } catch {}
});

// ── 存档同步 ──
async function refreshSyncStatus() {
  try {
    const r = await window.electron.invoke('get-sync-path');
    const el = document.getElementById('sync-status');
    if (r && r.path) {
      el.textContent = '已同步至: ' + r.path;
      el.style.color = 'var(--fg)';
    } else {
      el.textContent = '未设置';
      el.style.color = 'var(--dim)';
    }
  } catch {}
}
document.getElementById('btn-select-sync-dir')?.addEventListener('click', async () => {
  try { await window.electron.invoke('select-sync-directory'); refreshSyncStatus(); } catch {}
});
document.getElementById('btn-sync-now')?.addEventListener('click', async () => {
  try {
    const r = await window.electron.invoke('sync-now');
    if (r.success) showToast('同步完成', 'info');
    else showToast('同步失败: ' + (r.error || ''), 'error');
  } catch { showToast('同步失败', 'error'); }
});
document.getElementById('btn-delete-save')?.addEventListener('click', async () => {
  const ok = await showConfirmModal('确定删除所有存档？此操作不可撤销。');
  if (!ok) return;
  try {
    await window.electron.invoke('delete-save');
    window.location.reload();
  } catch { showToast('删除失败', 'error'); }
});
const THEMES = [
  { id:'red', label:'红', fg:'#FF6B8A', bg:'#1A0508', dim:'#A85570' },
  { id:'orange', label:'橙', fg:'#FFA552', bg:'#1A0C00', dim:'#B07030' },
  { id:'yellow', label:'黄', fg:'#FFE066', bg:'#1A1600', dim:'#A89030' },
  { id:'green', label:'绿', fg:'#00FF66', bg:'#050A05', dim:'#00AA44' },
  { id:'cyan', label:'蓝绿', fg:'#5FE3D7', bg:'#051A16', dim:'#3A9A90' },
  { id:'blue', label:'蓝', fg:'#6BA6FF', bg:'#08111F', dim:'#3A6AAA' },
  { id:'purple', label:'紫', fg:'#D09BFF', bg:'#150A1A', dim:'#8A60A8' },
  { id:'black', label:'黑', fg:'#E0E4F0', bg:'#0A0A12', dim:'#606080' },
  { id:'white', label:'白', fg:'#3A3D55', bg:'#F0F2F8', dim:'#8888A0' },
  { id:'custom', label:'自定义', fg:'#00FF66', bg:'#050A05', dim:'#00AA44' },
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
  window.electron.invoke('get-archived-scenarios').then(archivedIds => {
    const archivedSet = new Set(archivedIds || []);
      scenarioList.filter(s => !archivedSet.has(s.id)).forEach(s => {
        const card = document.createElement('div'); card.className = `scenario-card${s.id === cid ? ' active' : ''}`;
        const userTag = s.isUserMade ? `<span class="user-made-tag">${t('labelUserMade')}</span>` : '';
        card.innerHTML = `<div class="scenario-name" style="color:${s.id === cid ? '#0F0' : '#888'}">${s.nameCN} (${s.name})${userTag}</div><div class="scenario-desc">${s.description}</div><div class="scenario-stats"><span>${s.eventCount} ${t('scenarioEvent')}</span><span>${s.achievementCount} ${t('scenarioAchievement')}</span></div>`;
        card.addEventListener('click', async () => { try { const r = await window.electron.invoke('select-scenario', { id: s.id, alias: '' }); gameState = r.game; currentScenario = r.scenario; currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); scenarioPanel.classList.add('hidden'); updateUI(); } catch (e) { showToast(t('systemEnterFail'), 'error'); } });
        scenarioListEl.appendChild(card);
      });
    }).catch(() => {
      scenarioList.forEach(s => {
        const card = document.createElement('div'); card.className = `scenario-card${s.id === cid ? ' active' : ''}`;
        const userTag = s.isUserMade ? `<span class="user-made-tag">${t('labelUserMade')}</span>` : '';
        card.innerHTML = `<div class="scenario-name" style="color:${s.id === cid ? '#0F0' : '#888'}">${s.nameCN} (${s.name})${userTag}</div><div class="scenario-desc">${s.description}</div><div class="scenario-stats"><span>${s.eventCount} ${t('scenarioEvent')}</span><span>${s.achievementCount} ${t('scenarioAchievement')}</span></div>`;
        card.addEventListener('click', async () => { try { const r = await window.electron.invoke('select-scenario', { id: s.id, alias: '' }); gameState = r.game; currentScenario = r.scenario; currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('info', tf('systemEntered', currentScenario.nameCN)); scenarioPanel.classList.add('hidden'); updateUI(); } catch (e) { showToast(t('systemEnterFail'), 'error'); } });
        scenarioListEl.appendChild(card);
      });
  });
}
document.getElementById('btn-close').addEventListener('click', () => window.electron.invoke('hide-window'));
scenarioClose.addEventListener('click', () => scenarioPanel.classList.add('hidden'));
titlesClose.addEventListener('click', () => titlesPanel.classList.add('hidden'));
achievementClose.addEventListener('click', () => achievementPanel.classList.add('hidden'));

async function renderTitlesPanel() {
  titlesListEl.innerHTML = '';
  if (gameState?.is_in_hub) {
    // 大厅称号分组
    const hubGroup = document.createElement('div'); hubGroup.className = 'title-group-header';
    hubGroup.textContent = t('hubTitleGroup');
    titlesListEl.appendChild(hubGroup);
    try {
      const hubTitle = await window.electron.invoke('get-hub-title');
      if (hubTitle) {
        const hubTitlesList = [
          { level: 1, name: '新人', desc: '刚踏上旅途' },
          { level: 5, name: '初学者', desc: '略有经历' },
          { level: 10, name: '行者', desc: '步履初启' },
          { level: 15, name: '探索者', desc: '开始见识世界' },
          { level: 20, name: '寻路人', desc: '有了方向' },
          { level: 30, name: '漫游者', desc: '走过几段路' },
          { level: 40, name: '远行客', desc: '脚步渐远' },
          { level: 50, name: '冒险家', desc: '已非新人' },
          { level: 70, name: '历练者', desc: '阅历渐深' },
          { level: 90, name: '跋涉者', desc: '行路万里' },
          { level: 110, name: '见闻广博者', desc: '见过许多世界' },
          { level: 130, name: '行万里路者', desc: '脚印遍布' },
          { level: 150, name: '传奇行者', desc: '传说的开始' },
          { level: 180, name: '传奇', desc: '传奇进行时' },
          { level: 200, name: '传奇冒险家', desc: '传奇已成' },
          { level: 250, name: '不朽行者', desc: '时光难掩' },
          { level: 300, name: '永恒', desc: '超越岁月' },
          { level: 350, name: '超越者', desc: '超越了旅程' },
          { level: 400, name: '归来者', desc: '千帆过尽' },
          { level: 500, name: '万界漫游者', desc: '漫游万千世界' },
        ];
        hubTitlesList.forEach(tl => {
          const u = hubLevel >= tl.level;
          const it = document.createElement('div'); it.className = `title-item${u ? '' : ' locked'}${u && hubTitle.name === tl.name ? ' equipped' : ''}`;
          it.innerHTML = `<span class="title-level">Lv.${tl.level}</span><span class="title-name" style="color:${u ? 'var(--fg)' : 'var(--dim)'}">${u ? tl.name : '???'}</span><span class="title-desc">${u ? tl.desc : '???'}</span>`;
          titlesListEl.appendChild(it);
        });
      }
    } catch {}

    // 分隔线
    const sep = document.createElement('div'); sep.style.cssText = 'height:1px;background:color-mix(in srgb,var(--fg) 10%,transparent);margin:8px 0;';
    titlesListEl.appendChild(sep);

    // 通关称号分组
    const compGroup = document.createElement('div'); compGroup.className = 'title-group-header';
    compGroup.textContent = t('completionTitleGroup');
    titlesListEl.appendChild(compGroup);
    try {
      const ctData = await window.electron.invoke('get-hub-completion-titles');
      if (ctData.unlocked && ctData.unlocked.length > 0) {
        for (const ct of ctData.unlocked) {
          const isEquipped = ctData.equipped?.scenarioId === ct.scenarioId;
          const it = document.createElement('div'); it.className = `title-item${isEquipped ? ' equipped' : ''}`;
          it.innerHTML = `<span class="title-name" style="color:#FFD700">${ct.title}</span><span class="title-desc">${ct.scenarioName}</span>`;
          it.style.cursor = 'pointer';
          it.addEventListener('click', async () => {
            try {
              const r = await window.electron.invoke('set-completion-title', { scenarioId: ct.scenarioId });
              if (r.success) {
                updateUI();
                renderTitlesPanel();
              }
            } catch (e) { showToast(t('systemTitleEquipFail'), 'error'); }
          });
          titlesListEl.appendChild(it);
        }
      } else {
        const empty = document.createElement('div'); empty.className = 'title-item';
        empty.innerHTML = `<span class="title-name" style="color:var(--dim)">${t('completionTitleEmpty')}</span>`;
        titlesListEl.appendChild(empty);
      }
    } catch {}

    // 分隔线
    const sep2 = document.createElement('div'); sep2.style.cssText = 'height:1px;background:color-mix(in srgb,var(--fg) 10%,transparent);margin:8px 0;';
    titlesListEl.appendChild(sep2);

    // 副本称号分组标题
    const scenarioGroup = document.createElement('div'); scenarioGroup.className = 'title-group-header';
    scenarioGroup.textContent = t('scenarioTitleGroup');
    titlesListEl.appendChild(scenarioGroup);

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
  // 大厅成就分组
  const hubGroup = document.createElement('div'); hubGroup.className = 'title-group-header';
  hubGroup.textContent = t('hubAchGroup');
  achievementListEl.appendChild(hubGroup);
  try {
    const hubAchs = await window.electron.invoke('get-hub-achievements');
    hubAchs.forEach(a => {
      const it = document.createElement('div'); it.className = `title-item${a.unlocked ? '' : ' locked'}`;
      const condStr = a.condition.type === 'hub_level' ? `大厅 Lv.${a.condition.value}` : a.condition.type === 'completions' ? `通关 ${a.condition.value} 个副本` : a.condition.type === 'completions_half' ? '通关一半副本' : a.condition.type === 'completions_all' ? '通关所有副本' : a.condition.type === 'rebirths' ? `重生 ${a.condition.value} 次` : '';
      it.innerHTML = `<span class="title-name" style="color:${a.unlocked ? 'var(--fg)' : 'var(--dim)'}">${a.unlocked ? a.name : '???'}</span><span class="title-desc">${a.unlocked ? a.desc : condStr}</span>`;
      achievementListEl.appendChild(it);
    });
  } catch {}

  // 分隔线
  const sep = document.createElement('div'); sep.style.cssText = 'height:1px;background:color-mix(in srgb,var(--fg) 10%,transparent);margin:8px 0;';
  achievementListEl.appendChild(sep);

  // 副本成就分组
  const scenarioGroup = document.createElement('div'); scenarioGroup.className = 'title-group-header';
  scenarioGroup.textContent = t('scenarioAchGroup');
  achievementListEl.appendChild(scenarioGroup);

  const id = gameState?.scenario_id;
  if (!id) { achievementListEl.innerHTML += '<div class="hub-empty-text">请先进入副本</div>'; return; }
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
  eventListEl.innerHTML = '<div class="skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
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
          body.innerHTML = '<div class="skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
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

async function renderEndingPanel() {
  endingPanelList.innerHTML = '<div class="skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
  try {
    const stats = await window.electron.invoke('get-hub-stats');
    endingPanelList.innerHTML = '';
    if (!stats.completions || stats.completions.length === 0) {
      endingPanelList.innerHTML = `<div class="hub-empty-text">${t('endingEmpty')}</div>`;
      return;
    }
    stats.completions.forEach(c => {
      const sc = scenarioList.find(s => s.id === c.scenarioId);
      const it = document.createElement('div'); it.className = 'title-item';
      it.innerHTML = `<span class="title-name" style="color:var(--fg)">${sc ? sc.nameCN : c.scenarioId}</span><span class="title-desc">${tf('endingRecord', c.date, c.rebirthCount + 1, '')}</span>`;
      endingPanelList.appendChild(it);
    });
  } catch (e) { endingPanelList.innerHTML = '<div class="hub-empty-text">加载失败</div>'; }
}

async function updateTooltip() {
  if (!gameState) return;
  const rt = formatRuntime(gameState.total_runtime_ms);
  const title = currentTitle?.name || '?';
  const lv = gameState.is_in_hub ? `${t('hubLevel')}${hubLevel}` : `Lv.${gameState.level}`;
  const sc = currentScenario?.nameCN || (gameState.is_in_hub ? t('statusHub') : '?');
  try { await window.electron.invoke('update-tooltip', { text: `${gameState.player_name} | ${sc}\n${lv} | ${title} | ${rt}` }); } catch (e) {}
}

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

// ── User Scenarios ──
document.getElementById('btn-open-scenarios-folder')?.addEventListener('click', async () => {
  try { await window.electron.invoke('open-user-scenarios-folder'); } catch {}
});
document.getElementById('btn-refresh-scenarios')?.addEventListener('click', async () => {
  try {
    const r = await window.electron.invoke('refresh-user-scenarios');
    scenarioList = await window.electron.invoke('get-scenario-list');
    renderHubCards();
    renderScenarioPanel();
    showToast(`已加载 ${r.count} 个自制副本`, 'info');
  } catch { showToast('刷新失败', 'error'); }
});

bindCt('ct-fg'); bindCt('ct-bg'); bindCt('ct-dim'); bindCt('ct-border');

init().then(() => {
  document.title = `Idel-DreamMaker v${appVersion}`;
  const versionEl = document.getElementById('update-current-version');
  if (versionEl) versionEl.textContent = appVersion;
  applyTheme(gameState?.selected_font_theme || 'green');
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
