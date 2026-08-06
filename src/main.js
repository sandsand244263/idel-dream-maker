// IPC via window.electron (provided by preload.cjs)

const LANG = {
  hubWelcome: '欢迎回家', hubLevel: '宠物 Lv.',
  noScenarios: '暂无可用的世界', hubEmptyHint: '点击下方 [世界] 选择一个故事世界',
  btnBack: '家', btnScenario: '世界', btnJourney: '历程',
  btnSettings: '设置', btnTutorial: '教程',
  jTitle: '称号', jAchievement: '成就', jEvent: '事件', jStats: '按键',
  jArchivePet: '宠物档案', jArchiveWorld: '世界档案',
  panelScenario: '世界选择', panelTitles: '称号一览', panelAchievement: '成就一览', panelEvent: '事件记录', panelStats: '按键统计', panelSettings: '设置',
  labelName: '名称',
  settingsSave: '保存', settingsThemeTitle: '主题', ctSave: '应用自定义配色',
  eventHeader: '事件', achievementHeader: '成就解锁',
  systemInitFail: '初始化失败', systemEnterFail: '进入世界失败',
  systemBackFail: '返回失败',
  systemLevelUp: '等级 {0}！{1}',
  systemEntered: '进入: {0}', systemBack: '返回家',
  systemTitleEquipFail: '佩戴称号失败', systemTitleFetchFail: '获取宠物称号失败',
  systemDetailFail: '获取世界详情失败', systemThemeFail: '切换主题失败',
  logStartHub: '启动完成', logStartScenario: '已挂机 {0}，等级 {1}',
  scenarioEvent: '事件', scenarioAchievement: '成就',
  hubTitleEmpty: '尚无解锁称号',
  confirmTitle: '返回家', confirmDesc: '确定返回家吗？世界进度将保留。',
  confirmCancel: '取消', confirmOk: '确定',
  obWelcome: '欢迎来到', obSubtitle: 'Idel-DreamMaker',
  obDesc1: '藏在系统托盘里的宠物陪伴应用', obDesc2: '挂机攒故事 · 解锁称号与成就',
  obDesc3: '触发故事事件——陪你度过每一刻',
  obHow: '如何开始：',   obStep1: '点击 [世界] 选择一个故事世界',
  obStep2: '进入后挂机攒故事，打字还能加速', obStep3: '点击宠物气泡读故事，通关分支解锁称号',
  obStep4: '通关后解锁更多世界，故事还会重访',
  obTip: '提示：宠物窗口常驻桌面，点击宠物可交互',
  obName: '你的名称', obNamePlaceholder: '输入名称', obStart: '开始冒险',
  onboardingGender: '你的宠物是男孩还是女孩？',
  onboardingGenderSkip: '跳过 = 中性（只用通用台词）',
  obGenderMale: '男孩', obGenderFemale: '女孩', obGenderSkip: '跳过',
  btnOpenScenariosFolder: '打开世界文件夹',
  btnRefreshScenarios: '刷新世界列表',
  scenariosFolderHint: '将 .md 世界文件放入打开的文件夹，点「刷新」即可自动加载',
  labelUserMade: '自制',
  statusHub: '（家）', statusNone: '-',
  eventToday: '今天',
  eventDate: '{0}月{1}日',
  endingHeader: '旅程完成',
  endingStatusBranch: '这个世界还有 {0} 条分支没探索',
  endingStatusHidden: '隐藏内容还剩 {0} 个未发现',
  endingStatusAll: '这个世界的故事你已经看完了',
  endingStatusUnlocked: '{0} 世界已解锁',
  endingRevisit: '重访世界（从抉择处继续）',
  endingBackSelect: '回到世界选择',
  endingContinue: '继续收集',
  endingGoNew: '前往新世界',
  endingHub: '返回家',
  endingPanel: '结局收藏',
  endingEmpty: '暂无通关记录',
  endingRecord: '{0} · {1}周目 · {2}',
  hubCompletion: '通关 {0}/{1}',
  worldLocked: '通关 {0} 个世界后解锁',
  worldInProgress: '进行中 · 已读 {0} 段',
  worldCleared: '已通关 {0}/{1} 分支',
  worldGraduated: '全分支通关 · 隐藏全收集',
  hubTitleGroup: '宠物称号',
  completionTitleGroup: '通关称号',
  completionTitleEmpty: '暂无通关称号',
  scenarioTitleGroup: '世界称号',
  hubAchGroup: '宠物成就',
  scenarioAchGroup: '世界成就',
  archiveTitle: '档案中心',
  archivePet: '宠物档案', archiveWorld: '世界档案',
  archName: '宠物名', archGender: '性别', archLevel: '等级', archFullness: '饱食', archMood: '心情', archClean: '清洁',
  archFoods: '食物', archSoaps: '肥皂', archTime: '陪伴时长', archTyping: '累计打字', archStories: '阅读段数', archHidden: '隐藏内容',
  archTierProgress: '称号进度',
  archWorldNone: '暂无世界档案',
  statsTotalTime: '陪伴总时长',
  genderMale: '男孩', genderFemale: '女孩', genderNeutral: '中性',
  petCall: '叫你 {0}',
  changelogTitle: '{0} 更新说明', changelogOk: '知道了',
  revisitTitle: '再次进入「{0}」',
  revisitDesc: '这个世界你已经走过一段旅程，想从哪里开始？',
  revisitRestart: '从头重温', revisitContinue: '从抉择处继续', revisitCancel: '取消',
  archivedLabel: '已归档',
  restoreBtn: '恢复',
  scenarioArchived: '已归档',
  archiveFail: '归档失败',
  archiveAllDone: '所有世界都已通关',
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

// 前端错误捕获：将运行时错误写入日志
window.addEventListener('error', (e) => {
  const msg = `[FRONTEND_ERROR] ${e.message} ${e.filename ? 'at '+e.filename+':'+e.lineno : ''}`;
  try { window.electron.invoke('add-log-entry', { type: 'error', msg: msg.slice(0, 500) }).catch(() => {}); } catch {}
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  const msg = `[FRONTEND_UNHANDLED] ${reason?.message || reason || 'unknown'}`;
  try { window.electron.invoke('add-log-entry', { type: 'error', msg: msg.slice(0, 500) }).catch(() => {}); } catch {}
});

function t(key) { return LANG[key] || key; }
function tf(key, ...args) { let s = t(key); args.forEach((a, i) => { s = s.replace(`{${i}}`, String(a)); }); return s; }

let gameState = null, scenarioList = [], currentScenario = null, currentTitle = null, hubLevel = 1, appVersion = '1.0.0';
let eventDismissTimer = null, achievementDismissTimer = null;
let lastRuntime = 0;

const logArea = document.getElementById('log-area');
const scenarioView = document.getElementById('scenario-view');
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
const expBuffBadge = document.getElementById('exp-buff-badge');
const eventPanel = document.getElementById('event-panel');
const eventClose = document.getElementById('event-close');
const eventListEl = document.getElementById('event-list');
const hubTitleDisplay = document.getElementById('hub-title-display');
const hubCompletionDisplay = document.getElementById('hub-completion-display');
const hubPetInfo = document.getElementById('hub-pet-info');
const endingOverlay = document.getElementById('ending-overlay');
const endingScenarioName = document.getElementById('ending-scenario-name');
const endingText = document.getElementById('ending-text');
const endingTitleEl = document.getElementById('ending-title');
const endingStatusEl = document.getElementById('ending-status');
const endingButtonsEl = document.getElementById('ending-buttons');
const endingPanel = document.getElementById('ending-panel');
const endingPanelClose = document.getElementById('ending-panel-close');
const endingPanelList = document.getElementById('ending-panel-list');
const statsPanel = document.getElementById('stats-panel');
const statsClose = document.getElementById('stats-close');
const statsListEl = document.getElementById('stats-list');
const archivePanel = document.getElementById('archive-panel');
const archiveClose = document.getElementById('archive-close');
const archivePetBody = document.getElementById('archive-pet-body');
const archiveWorldBody = document.getElementById('archive-world-body');
const archiveEventBody = document.getElementById('archive-event-body');
const archiveStatsBody = document.getElementById('archive-stats-body');
const changelogModal = document.getElementById('changelog-modal');
const changelogClose = document.getElementById('changelog-close');
const changelogOk = document.getElementById('changelog-ok');
const changelogTitleEl = document.getElementById('changelog-title');
const changelogPointsEl = document.getElementById('changelog-points');
const revisitModal = document.getElementById('revisit-modal');
const revisitTitleEl = document.getElementById('revisit-title');
const revisitDescEl = document.getElementById('revisit-desc');
const revisitRestartBtn = document.getElementById('revisit-restart');
const revisitContinueBtn = document.getElementById('revisit-continue');
const revisitCancelBtn = document.getElementById('revisit-cancel');

const confirmModal = document.getElementById('confirm-modal');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
let confirmResolver = null;
function showConfirmModal(desc) {
  return new Promise((resolve) => {
    document.getElementById('confirm-desc').textContent = desc;
    confirmModal.classList.remove('closing'); confirmModal.classList.remove('hidden'); confirmResolver = resolve;
  });
}
confirmOk.addEventListener('click', () => { closeWithAnimation(confirmModal); if (confirmResolver) { confirmResolver(true); confirmResolver = null; } });
confirmCancel.addEventListener('click', () => { closeWithAnimation(confirmModal); if (confirmResolver) { confirmResolver(false); confirmResolver = null; } });

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
    if (expBuffBadge) {
      const bm = p.buff_multiplier || 1;
      const br = p.buff_remaining || 0;
      if (bm > 1 && br > 0) {
        expBuffBadge.textContent = 'x' + bm;
        expBuffBadge.classList.remove('hidden');
      } else {
        expBuffBadge.classList.add('hidden');
      }
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
  window.electron.on('scenario-changed', (event) => { gameState = event.game; currentScenario = event.scenario; currentTitle = { name: event.scenario.playerTitle, color: '#888', desc: '' }; switchView(false); addLog('system', tf('systemEntered', currentScenario.nameCN)); updateUI(); });
  window.electron.on('auto-save', () => { flashSaveDot(); });
  window.electron.on('scenario-ending', (event) => {
    showJourneyComplete(event);
  });
}

// ── v4 旅程完成面板（§4.8 四态）──
async function showJourneyComplete(ev) {
  // 刷新状态（gameCompletions 已更新，重新拉取）
  try {
    const full = await window.electron.invoke('get-full-state');
    if (full?.game) { gameState = full.game; currentScenario = full.scenario; currentTitle = full.currentTitle; hubLevel = full.petLevel || hubLevel; }
  } catch {}
  endingScenarioName.textContent = ev.scenarioName;
  endingText.textContent = ev.text;
  if (ev.endingTitle) {
    endingTitleEl.textContent = '解锁称号: ' + ev.endingTitle;
    endingTitleEl.style.display = 'block';
  } else {
    endingTitleEl.style.display = 'none';
  }
  endingStatusEl.classList.remove('new-world');
  endingButtonsEl.innerHTML = '';
  const w = computeWorldState(ev.scenarioId);
  const branchLeft = Math.max(0, w.branchTotal - w.completedBranches.length);
  const hiddenLeft = Math.max(0, w.hiddenTotal - w.hiddenRead);
  const btn = (label, action, primary) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (primary) b.classList.add('primary');
    b.addEventListener('click', action);
    endingButtonsEl.appendChild(b);
    return b;
  };
  if (branchLeft > 0) {
    endingStatusEl.textContent = tf('endingStatusBranch', branchLeft);
    btn(t('endingRevisit'), () => { closeWithAnimation(endingOverlay); selectWorld(ev.scenarioId); }, true);
    btn(t('endingBackSelect'), () => { closeWithAnimation(endingOverlay); exitToHome(); });
  } else if (hiddenLeft > 0) {
    endingStatusEl.textContent = tf('endingStatusHidden', hiddenLeft);
    btn(t('endingContinue'), () => { closeWithAnimation(endingOverlay); selectWorld(ev.scenarioId); }, true);
    btn(t('endingBackSelect'), () => { closeWithAnimation(endingOverlay); exitToHome(); });
  } else {
    endingStatusEl.textContent = t('endingStatusAll');
    btn(t('endingBackSelect'), () => { closeWithAnimation(endingOverlay); exitToHome(); }, true);
  }
  // 新解锁世界判定：通关后 completionCount 刚好达标的世界（排除当前世界）
  try {
    const unlocks = await window.electron.invoke('get-scenario-unlocks');
    const newWorld = unlocks.find(u => u.unlocked && !u.archived && u.id !== ev.scenarioId && u.requirement && u.requirement.completions > 0 && u.completionCount === u.requirement.completions);
    if (newWorld) {
      const sc = scenarioList.find(s => s.id === newWorld.id);
      endingStatusEl.classList.add('new-world');
      endingStatusEl.textContent = tf('endingStatusUnlocked', sc ? sc.nameCN : newWorld.id);
      btn(t('endingGoNew'), () => { closeWithAnimation(endingOverlay); selectWorld(newWorld.id); }, true);
      btn(t('endingBackSelect'), () => { closeWithAnimation(endingOverlay); exitToHome(); });
    }
  } catch {}
  endingOverlay.classList.remove('closing');
  endingOverlay.classList.remove('hidden');
}

// 回到世界选择：返回家并打开世界选择面板
async function exitToHome() {
  try {
    const r = await window.electron.invoke('exit-to-hub');
    gameState = gameState || {};
    gameState.is_in_hub = true;
    if (r && r.petLevel) hubLevel = r.petLevel;
    switchView(true);
    renderHubView(); renderHubCards(); updateUI();
    addLog('system', t('systemBack'));
    lastRuntime = 0;
    scenarioList = await window.electron.invoke('get-scenario-list').catch(() => scenarioList);
    renderScenarioPanel();
    scenarioPanel.classList.remove('closing');
    scenarioPanel.classList.remove('hidden');
  } catch (e) { showToast(t('systemBackFail'), 'error'); }
}

// ── v4 重访起点选择（任务7）──
function showRevisitModal(scenarioName) {
  revisitTitleEl.textContent = tf('revisitTitle', scenarioName);
  revisitDescEl.textContent = t('revisitDesc');
  revisitModal.classList.remove('closing');
  revisitModal.classList.remove('hidden');
}
revisitRestartBtn.addEventListener('click', async () => {
  closeWithAnimation(revisitModal);
  try {
    const r = await window.electron.invoke('revisit-start', { mode: 'restart' });
    if (r.success) { gameState = r.game; addLog('system', t('systemBack')); updateUI(); }
  } catch {}
});
revisitContinueBtn.addEventListener('click', async () => {
  closeWithAnimation(revisitModal);
  try {
    const r = await window.electron.invoke('revisit-start', { mode: 'continue' });
    if (r.success) { gameState = r.game; updateUI(); }
  } catch {}
});
revisitCancelBtn.addEventListener('click', () => {
  closeWithAnimation(revisitModal);
  exitToHome();
});

// ── v4 统一进入世界入口：处理 worldRevisited 重访弹窗 ──
async function selectWorld(id) {
  try {
    const r = await window.electron.invoke('select-scenario', { id, alias: '' });
    gameState = r.game; currentScenario = r.scenario;
    currentTitle = getTitleByIndex(gameState.equipped_title_index) || { name: r.scenario.playerTitle, color: '#888', desc: '' };
    switchView(false);
    addLog('system', tf('systemEntered', currentScenario.nameCN));
    updateUI();
    if (r.worldRevisited) showRevisitModal(currentScenario.nameCN);
    return r;
  } catch (e) {
    showToast(t('systemEnterFail'), 'error');
    return null;
  }
}
endingPanelClose.addEventListener('click', () => closeWithAnimation(endingPanel));

function switchView(inHub) {
  hubView.classList.toggle('hidden', !inHub); scenarioView.classList.toggle('hidden', inHub);
  btnBackHub.classList.toggle('hidden', inHub); btnScenario.classList.toggle('hidden', !inHub);
}

function calcLevel(exp) {
  if (exp <= 0) return 1;
  if (exp <= 980100) return Math.floor(Math.sqrt(exp / 100)) + 1;
  const r = exp - 980100;
  return 100 + Math.floor((-3995 + Math.sqrt(15960025 + 20 * r)) / 10);
}
function calcExpForLevel(level) { if (level <= 1) return 0; if (level <= 100) return 100 * (level - 1) * (level - 1); const n = level - 100; return 980100 + n * (2 * 4000 + (n - 1) * 10) / 2; }
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

function closeWithAnimation(el) {
  if (!el || el.classList.contains('hidden') || el.classList.contains('closing')) return;
  el.classList.add('closing');
}
document.addEventListener('animationend', (e) => {
  if (e.target.classList.contains('closing') && !e.target.id.startsWith('toast')) {
    e.target.classList.add('hidden');
    e.target.classList.remove('closing');
  }
});

// ── v4 世界数据索引（fetch 构建产物，用于分支/隐藏进度推导）──
let worldIndex = {};   // sid -> { branches:[], events:[] }
async function loadWorldIndex() {
  try {
    const resp = await fetch('/scenarios_data.json');
    const data = await resp.json();
    const list = Array.isArray(data) ? data : (data.scenarios || []);
    list.forEach(sc => { worldIndex[sc.id] = { branches: Array.isArray(sc.branches) ? sc.branches : [], events: sc.events || [] }; });
  } catch (e) { worldIndex = {}; }
}

// 按世界计算：已通关分支集合 / 隐藏收集 / 已读段数（当前世界用 live 状态，其余用切出快照）
function computeWorldState(sid) {
  const cur = !!gameState && sid === gameState.scenario_id;
  const triggered = cur ? (gameState.triggered_events || []) : ((gameState?.scenario_progress?.[sid]?.triggeredEvents) || []);
  const wi = worldIndex[sid] || { branches: [], events: [] };
  const completed = new Set();
  let hiddenRead = 0;
  for (const e of wi.events) {
    if (!e.completionTitle || !e.branch) continue;
    if (triggered.includes(e.id)) completed.add(e.branch);
  }
  const hiddenEvents = wi.events.filter(e => e.branch === 'hidden');
  for (const e of hiddenEvents) if (triggered.includes(e.id)) hiddenRead++;
  return {
    branchTotal: wi.branches.length,
    completedBranches: [...completed],
    hiddenTotal: hiddenEvents.length,
    hiddenRead,
    readCount: triggered.length,
  };
}

function branchLineHtml(branches, completed) {
  if (!branches || branches.length === 0) return '';
  const spans = branches.map(b => {
    const done = completed.includes(b);
    return `<span class="${done ? 'br-done' : 'br-todo'}">${done ? '✓' : '·'} ${b}</span>`;
  });
  return `<div class="hub-card-branches">${spans.join('')}</div>`;
}

// ── Hub View ──
let _hubStatsTimer = null;
function renderHubView() {
  if (!gameState) return;
  hubGreeting.textContent = t('hubWelcome'); hubPlayerName.textContent = gameState.player_name;
  hubLevelDisplay.textContent = `${t('hubLevel')}${hubLevel}`;
  if (hubPetInfo) {
    const g = gameState.pet_gender === 'male' ? t('genderMale') : gameState.pet_gender === 'female' ? t('genderFemale') : t('genderNeutral');
    hubPetInfo.textContent = `${g} · ${tf('petCall', gameState.pet_call_name || '主人')}`;
  }
  // 家统计 5 秒节流一次（避免每 500ms tick 空转 IPC）；顺带刷新宠物称谓（右键菜单改名后可见）
  if (_hubStatsTimer) return;
  _hubStatsTimer = setTimeout(() => { _hubStatsTimer = null; }, 5000);
  window.electron.invoke('get-hub-stats').then(stats => {
    if (hubTitleDisplay) hubTitleDisplay.textContent = stats.hubTitle ? stats.hubTitle.name : '';
    if (hubCompletionDisplay) hubCompletionDisplay.textContent = tf('hubCompletion', stats.completionCount, stats.totalScenarios);
  }).catch(() => {});
  window.electron.invoke('get-full-state').then(full => {
    if (full?.game?.pet_call_name !== undefined && full.game.pet_call_name !== gameState.pet_call_name) {
      gameState = { ...gameState, pet_call_name: full.game.pet_call_name, pet_gender: full.game.pet_gender };
      if (hubPetInfo) {
        const g = gameState.pet_gender === 'male' ? t('genderMale') : gameState.pet_gender === 'female' ? t('genderFemale') : t('genderNeutral');
        hubPetInfo.textContent = `${g} · ${tf('petCall', gameState.pet_call_name || '主人')}`;
      }
    }
  }).catch(() => {});
}

function renderHubCards() {
  if (!scenarioList) return;
  hubScenarioList.innerHTML = '';
  if (!scenarioList || scenarioList.length === 0) {
    hubScenarioList.innerHTML = `<div class="hub-empty"><div class="hub-empty-icon">[ ~ ~ ]</div><div class="hub-empty-text">${t('noScenarios')}</div><div class="hub-empty-hint">${t('hubEmptyHint')}</div></div>`;
    return;
  }
  // 新手引导：未进过任何世界时显示
  const hasProgress = gameState?.scenario_progress && Object.keys(gameState.scenario_progress).length > 0;
  if (!hasProgress && !gameState?.triggered_events?.length) {
    const guide = document.createElement('div');
    guide.className = 'hub-guide';
    guide.textContent = '→ 点击下方[世界]开始你的第一个故事';
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
    // 未归档卡片（v4 四态：锁定/进行中/通关/毕业）
    activeList.forEach(s => {
      const u = unlockMap[s.id] || { unlocked: true, requirement: {} };
      const locked = !u.unlocked;
      const w = computeWorldState(s.id);
      const graduated = !locked && w.branchTotal > 0 && w.completedBranches.length >= w.branchTotal && w.hiddenRead >= w.hiddenTotal;
      const cleared = !locked && w.completedBranches.length > 0;
      const card = document.createElement('div');
      card.className = 'hub-card' + (locked ? ' locked' : '') + (graduated ? ' graduated' : '');
      const nameDiv = document.createElement('div'); nameDiv.className = 'hub-card-name';
      nameDiv.textContent = `${s.nameCN} (${s.name})${cleared ? ' ✓' : ''}`;
      if (s.isUserMade) { const tagSpan = document.createElement('span'); tagSpan.className = 'user-made-tag'; tagSpan.textContent = t('labelUserMade'); nameDiv.appendChild(tagSpan); }
      card.appendChild(nameDiv);
      if (graduated) {
        const tag = document.createElement('span'); tag.className = 'grad-tag'; tag.textContent = '毕业';
        card.appendChild(tag);
      }
      const descDiv = document.createElement('div'); descDiv.className = 'hub-card-desc';
      descDiv.textContent = s.description; card.appendChild(descDiv);
      const metaDiv = document.createElement('div'); metaDiv.className = 'hub-card-meta';
      metaDiv.textContent = `${s.eventCount} ${t('scenarioEvent')} · ${s.achievementCount} ${t('scenarioAchievement')}`;
      card.appendChild(metaDiv);
      // 状态行（四态）
      const statusDiv = document.createElement('div'); statusDiv.className = 'hub-card-status';
      if (locked) {
        statusDiv.textContent = tf('worldLocked', u.requirement?.completions || 0);
      } else if (graduated) {
        statusDiv.textContent = t('worldGraduated');
      } else if (cleared) {
        statusDiv.textContent = tf('worldCleared', w.completedBranches.length, w.branchTotal);
      } else {
        statusDiv.textContent = tf('worldInProgress', w.readCount);
      }
      card.appendChild(statusDiv);
      // 分支进度行（通关/毕业态）
      if (cleared && w.branchTotal > 0) {
        const tmp = document.createElement('div');
        tmp.innerHTML = branchLineHtml(worldIndex[s.id]?.branches || [], w.completedBranches);
        while (tmp.firstChild) card.appendChild(tmp.firstChild);
      }
      const archiveBtn = (u.unlocked && u.canArchive) ? `<span class="archive-btn" data-sid="${s.id}">[归档]</span>` : '';
      if (archiveBtn) { const tmp = document.createElement('div'); tmp.innerHTML = archiveBtn; while (tmp.firstChild) card.appendChild(tmp.firstChild); }
      if (!locked) {
        card.addEventListener('click', async (e) => {
          if (e.target.closest('.archive-btn')) return;
          await selectWorld(s.id);
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
        const w = computeWorldState(s.id);
        let progHtml = '';
        if (w.completedBranches.length > 0) {
          progHtml = `<div class="hub-card-status">${tf('worldCleared', w.completedBranches.length, w.branchTotal)}</div>`;
        }
        const aNameDiv = document.createElement('div'); aNameDiv.className = 'hub-card-name';
        aNameDiv.textContent = `${s.nameCN} (${s.name})`; card.appendChild(aNameDiv);
        const aDescDiv = document.createElement('div'); aDescDiv.className = 'hub-card-desc';
        aDescDiv.textContent = s.description; card.appendChild(aDescDiv);
        if (progHtml) { const tmp = document.createElement('div'); tmp.innerHTML = progHtml; while (tmp.firstChild) card.appendChild(tmp.firstChild); }
        const rstBtn = document.createElement('span'); rstBtn.className = 'restore-btn'; rstBtn.dataset.sid = s.id;
        rstBtn.textContent = `[${t('restoreBtn')}]`; card.appendChild(rstBtn);
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
      const fNameDiv = document.createElement('div'); fNameDiv.className = 'hub-card-name';
      fNameDiv.textContent = `${s.nameCN} (${s.name})`; card.appendChild(fNameDiv);
      const fDescDiv = document.createElement('div'); fDescDiv.className = 'hub-card-desc';
      fDescDiv.textContent = s.description; card.appendChild(fDescDiv);
      const fMetaDiv = document.createElement('div'); fMetaDiv.className = 'hub-card-meta';
      fMetaDiv.textContent = `${s.eventCount} ${t('scenarioEvent')} · ${s.achievementCount} ${t('scenarioAchievement')}`;
      card.appendChild(fMetaDiv);
      card.addEventListener('click', async () => { await selectWorld(s.id); });
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
  try {
    const r = await window.electron.invoke('exit-to-hub');
    if (r && r.petLevel) hubLevel = r.petLevel;
    gameState.is_in_hub = true;
    gameState.scenario_id = '';
    switchView(true); renderHubView(); renderHubCards();
    addLog('system', t('systemBack')); updateUI(); lastRuntime = 0;
  } catch (e) { showToast(t('systemBackFail'), 'error'); }
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
  if (gameState.is_in_hub) {
    if (permaText) permaText.textContent = `宠物 Lv.${hubLevel} | ${currentTitle?.name || '?'}`;
  } else {
    const rt = formatRuntime(gameState.total_runtime_ms || 0);
    const dl = `Lv.${gameState.level}`;
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

  // Persist all log types to disk
  window.electron.invoke('add-log-entry', { type, msg: message }).catch(() => {});
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

btnScenario.addEventListener('click', async () => { try { scenarioList = await window.electron.invoke('get-scenario-list'); } catch (e) { showToast(t('systemDetailFail'), 'error'); } renderScenarioPanel(); scenarioPanel.classList.remove('closing'); scenarioPanel.classList.remove('hidden'); });

// ── Stats Panel ──
async function renderStatsPanel() {
  try {
    const s = await window.electron.invoke('get-key-stats');
    const items = [
      `<div class="stats-row"><span class="stats-label">总输入</span><span class="stats-value">${(s.total || 0).toLocaleString()}</span></div>`,
      `<div class="stats-row"><span class="stats-label">今日按键</span><span class="stats-value">${(s.daily || 0).toLocaleString()}</span></div>`,
      `<div class="stats-row"><span class="stats-label">当前连击</span><span class="stats-value">${s.keyChar ? s.keyChar + ' ×' + s.streak : '—'}</span></div>`,
      `<div class="stats-row"><span class="stats-label">最高连击</span><span class="stats-value">${(s.highestStreak || 0).toLocaleString()}</span></div>`,
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
    if (action === 'titles') { renderTitlesPanel(); titlesPanel.classList.remove('closing'); titlesPanel.classList.remove('hidden'); }
    else if (action === 'achievement') { renderAchievementPanel(); achievementPanel.classList.remove('closing'); achievementPanel.classList.remove('hidden'); }
    else if (action === 'archive-pet') { openArchivePanel('pet'); }
    else if (action === 'archive-world') { openArchivePanel('world'); }
    else if (action === 'archive-event') { openArchivePanel('event'); }
    else if (action === 'archive-stats') { openArchivePanel('stats'); }
  });
});
eventClose.addEventListener('click', () => closeWithAnimation(eventPanel));
statsClose.addEventListener('click', () => closeWithAnimation(statsPanel));

// ── v4 档案中心（四区：宠物/世界/事件/按键）──
async function openArchivePanel(section) {
  renderArchivePet();
  renderArchiveWorld();
  renderArchiveEvents();
  renderArchiveStats();
  archivePanel.classList.remove('closing');
  archivePanel.classList.remove('hidden');
  if (section) {
    const ids = { pet: 'archive-pet-body', world: 'archive-world-body', event: 'archive-event-body', stats: 'archive-stats-body' };
    const target = document.getElementById(ids[section]);
    if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 50);
  }
}
archiveClose.addEventListener('click', () => closeWithAnimation(archivePanel));

function shortNum(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return '0';
  if (v < 1000) return v.toFixed(0);
  if (v < 1000000) return (v / 1000).toFixed(2) + 'k';
  if (v < 1000000000) return (v / 1000000).toFixed(2) + 'M';
  return (v / 1000000000).toFixed(2) + 'B';
}

function kvRow(key, val, cls) {
  return `<div class="archive-kv"><span class="kv-key">${key}</span><span class="kv-val${cls ? ' ' + cls : ''}">${val}</span></div>`;
}

// 宠物档案区
async function renderArchivePet() {
  if (!archivePetBody || !gameState) return;
  const g = gameState.pet_gender === 'male' ? t('genderMale') : gameState.pet_gender === 'female' ? t('genderFemale') : t('genderNeutral');
  const rt = formatRuntime(gameState.total_runtime_ms || 0);
  const rows = [
    kvRow(t('archName'), gameState.player_name || '—'),
    kvRow(t('archGender'), `${g} · ${tf('petCall', gameState.pet_call_name || '主人')}`),
    kvRow(t('archLevel'), 'Lv.' + (gameState.pet_level || 1)),
    kvRow(t('archFullness'), (gameState.pet_fullness ?? 80) + '/100', (gameState.pet_fullness ?? 80) < 30 ? 'warn' : ''),
    kvRow(t('archMood'), (gameState.pet_mood ?? 80) + '/100', (gameState.pet_mood ?? 80) < 30 ? 'warn' : ''),
    kvRow(t('archClean'), (gameState.pet_cleanliness ?? 80) + '/100', (gameState.pet_cleanliness ?? 80) < 30 ? 'warn' : ''),
    kvRow(t('archFoods'), '🍪 ×' + (gameState.pet_foods || 0)),
    kvRow(t('archSoaps'), '🧼 ×' + (gameState.pet_soaps || 0)),
    kvRow(t('archTime'), rt),
    kvRow(t('archTyping'), shortNum(gameState.total_key_presses || 0)),
    kvRow(t('archStories'), (gameState.pet_stories_read || 0) + ' 段' + ((gameState.pet_hidden_read || 0) > 0 ? `（隐藏 ${gameState.pet_hidden_read}）` : '')),
  ];
  // 称号进度（阶梯档位：当前档/下一档）
  let tierHtml = '';
  try {
    const tr = await window.electron.invoke('get-tier-achievements');
    if (tr && tr.tiers) {
      const tierRows = tr.tiers.map(x => {
        const prog = x.unlockedTiers > 0 ? `${x.currentName} → ${x.nextName}` : `未解锁 → ${x.nextName}`;
        const val = x.current === undefined ? '' : `${x.current}/${x.nextValue}`;
        return `<div class="archive-tier-row"><span class="tr-name">${x.name}</span><span class="tr-prog"><b>${prog}</b> ${val}</span></div>`;
      });
      tierHtml = `<div style="margin-top:6px;border-top:1px solid color-mix(in srgb,var(--fg) 4%,transparent);padding-top:4px;"><div class="archive-kv" style="margin-bottom:2px;"><span class="kv-key">${t('archTierProgress')}</span></div>${tierRows.join('')}</div>`;
    }
  } catch {}
  archivePetBody.innerHTML = rows.join('') + tierHtml;
}

// 世界档案区（复用 §14.3 卡片样式）
async function renderArchiveWorld() {
  if (!archiveWorldBody) return;
  archiveWorldBody.innerHTML = '<div class="skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
  try {
    const unlocks = await window.electron.invoke('get-scenario-unlocks');
    if (!scenarioList || scenarioList.length === 0) { archiveWorldBody.innerHTML = `<div class="hub-empty-text">${t('archWorldNone')}</div>`; return; }
    const unlockMap = {}; unlocks.forEach(u => unlockMap[u.id] = u);
    let html = '';
    scenarioList.forEach(s => {
      const u = unlockMap[s.id] || { unlocked: true, requirement: {} };
      const locked = !u.unlocked;
      const w = computeWorldState(s.id);
      const graduated = !locked && w.branchTotal > 0 && w.completedBranches.length >= w.branchTotal && w.hiddenRead >= w.hiddenTotal;
      const cleared = !locked && w.completedBranches.length > 0;
      let statusText;
      if (locked) statusText = tf('worldLocked', u.requirement?.completions || 0);
      else if (graduated) statusText = t('worldGraduated');
      else if (cleared) statusText = tf('worldCleared', w.completedBranches.length, w.branchTotal);
      else statusText = tf('worldInProgress', w.readCount);
      const branches = (worldIndex[s.id]?.branches || []).map(b => {
        const done = w.completedBranches.includes(b);
        return `<span class="${done ? 'br-done' : 'br-todo'}">${done ? '✓' : '·'} ${b}</span>`;
      }).join('');
      const snap = gameState?.scenario_progress?.[s.id];
      const runtime = snap?.totalRuntimeMs ? formatRuntime(snap.totalRuntimeMs) : (s.id === gameState?.scenario_id ? formatRuntime(gameState.total_runtime_ms || 0) : '—');
      html += `<div class="archive-world-card${locked ? ' locked' : ''}${graduated ? ' graduated' : ''}" data-sid="${s.id}">
        <div class="awc-name">${s.nameCN} (${s.name})${cleared ? ' ✓' : ''}</div>
        <div class="awc-status">${statusText}</div>
        ${branches ? `<div class="awc-branches">${branches}</div>` : ''}
        <div class="awc-meta">${w.readCount} 段 · ${runtime}${w.hiddenTotal > 0 ? ` · 隐藏 ${w.hiddenRead}/${w.hiddenTotal}` : ''}</div>
      </div>`;
    });
    archiveWorldBody.innerHTML = html;
    archiveWorldBody.querySelectorAll('.archive-world-card:not(.locked)').forEach(card => {
      card.addEventListener('click', async () => { closeWithAnimation(archivePanel); await selectWorld(card.dataset.sid); });
    });
  } catch { archiveWorldBody.innerHTML = '<div class="hub-empty-text">加载失败</div>'; }
}

// 事件记录区（按世界分组的阅读史 + 系统日志）
async function renderArchiveEvents() {
  if (!archiveEventBody) return;
  archiveEventBody.innerHTML = '<div class="skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
  try {
    const logWorldIds = await window.electron.invoke('get-log-scenarios').catch(() => []);
    if (!logWorldIds || logWorldIds.length === 0) { archiveEventBody.innerHTML = '<div class="hub-empty-text">暂无事件记录</div>'; return; }
    const nameOf = id => { const s = scenarioList.find(x => x.id === id); return s ? s.nameCN : id; };
    const groups = [];
    for (const wid of logWorldIds) {
      const entries = await window.electron.invoke('get-log-entries', { scenario: wid }).catch(() => []);
      if (!entries || entries.length === 0) continue;
      groups.push({ id: wid, name: nameOf(wid), entries });
    }
    if (groups.length === 0) { archiveEventBody.innerHTML = '<div class="hub-empty-text">暂无事件记录</div>'; return; }
    archiveEventBody.innerHTML = '';
    groups.forEach((g, gi) => {
      const grp = document.createElement('div'); grp.className = 'archive-event-group';
      const hdr = document.createElement('div'); hdr.className = 'archive-event-header';
      hdr.textContent = `${gi === 0 ? '▼ ' : '▶ '}${g.name}（${g.entries.length}）`;
      const body = document.createElement('div'); body.className = 'archive-event-body' + (gi === 0 ? '' : ' hidden');
      g.entries.forEach(e => {
        const item = document.createElement('div'); item.className = 'archive-event-item ' + (e.ty || 'event');
        const ts = document.createElement('span'); ts.className = 'ts';
        ts.textContent = e.t && e.t.length >= 16 ? `[${e.t.slice(11, 16)}]` : '[--:--]';
        const msg = document.createElement('span'); msg.className = 'msg'; msg.textContent = e.m;
        item.appendChild(ts); item.appendChild(msg);
        body.appendChild(item);
      });
      hdr.addEventListener('click', () => {
        const hidden = body.classList.contains('hidden');
        body.classList.toggle('hidden');
        hdr.textContent = `${hidden ? '▼ ' : '▶ '}${g.name}（${g.entries.length}）`;
      });
      grp.appendChild(hdr); grp.appendChild(body);
      archiveEventBody.appendChild(grp);
    });
  } catch { archiveEventBody.innerHTML = '<div class="hub-empty-text">加载失败</div>'; }
}

// 按键统计区（保留现有 + 陪伴总时长）
async function renderArchiveStats() {
  if (!archiveStatsBody) return;
  try {
    const s = await window.electron.invoke('get-key-stats');
    const rt = formatRuntime(gameState?.total_runtime_ms || 0);
    const items = [
      `<div class="archive-stats-row"><span class="stats-label">${t('statsTotalTime')}</span><span class="stats-value">${rt}</span></div>`,
      `<div class="archive-stats-row"><span class="stats-label">总输入</span><span class="stats-value">${(s.total || 0).toLocaleString()}</span></div>`,
      `<div class="archive-stats-row"><span class="stats-label">今日按键</span><span class="stats-value">${(s.daily || 0).toLocaleString()}</span></div>`,
      `<div class="archive-stats-row"><span class="stats-label">当前连击</span><span class="stats-value">${s.keyChar ? s.keyChar + ' ×' + s.streak : '—'}</span></div>`,
      `<div class="archive-stats-row"><span class="stats-label">最高连击</span><span class="stats-value">${(s.highestStreak || 0).toLocaleString()}</span></div>`,
    ];
    archiveStatsBody.innerHTML = items.join('');
  } catch { archiveStatsBody.innerHTML = '<div class="stats-row" style="color:var(--dim)">加载失败</div>'; }
}

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
  settingsPanel.classList.remove('closing');
  settingsPanel.classList.remove('hidden');
}
btnSettings.addEventListener('click', openSettingsPanel);
settingsClose.addEventListener('click', () => closeWithAnimation(settingsPanel));
settingsNameSave.addEventListener('click', async () => { const n = settingsName.value.trim(); if (!n) return; try { await window.electron.invoke('set-player-name', { name: n }); if (gameState) gameState.player_name = n; renderHubView(); updateUI(); } catch (e) { showToast(t('systemEnterFail'), 'error'); } });
document.getElementById('btn-tutorial').addEventListener('click', async () => {
  if (onboardingInput) onboardingInput.value = gameState?.player_name || '';
  if (onboardingModal) { onboardingModal.classList.remove('closing'); onboardingModal.classList.remove('hidden'); }
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
      status.textContent = '发现新版本: v' + r.latestVersion + ' ';
      const dlLink = document.createElement('a'); dlLink.href = '#'; dlLink.id = 'update-dl-link';
      dlLink.style.cssText = 'color:var(--fg);'; dlLink.textContent = 'GitHub 下载';
      status.appendChild(dlLink);
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
    const installBtn = document.getElementById('btn-install-update');
    if (installBtn) installBtn.onclick = (e) => { e.preventDefault(); window.electron.invoke('trigger-update'); };
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
      window.electron.invoke('open-path', { path: r.path }).catch(() => {});
    } else {
      showToast(t('feedbackExportFail') + ': ' + (r.error || '未知错误'), 'error');
    }
  } catch (e) { showToast(t('feedbackExportFail') + ': ' + (e.message || '未知错误'), 'error'); }
  btn.textContent = origText;
  btn.disabled = false;
});
document.getElementById('btn-open-log-folder')?.addEventListener('click', async () => {
  try { await window.electron.invoke('open-log-folder'); } catch {}
});

// ── 存档同步 ──
function formatTime(iso) {
  if (!iso) return '未知';
  try {
    const d = new Date(iso);
    return d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0') + ' ' +
      String(d.getHours()).padStart(2,'0') + ':' +
      String(d.getMinutes()).padStart(2,'0') + ':' +
      String(d.getSeconds()).padStart(2,'0');
  } catch { return iso; }
}
async function refreshSyncStatus() {
  try {
    const r = await window.electron.invoke('get-sync-path');
    const el = document.getElementById('sync-status');
    const timeEl = document.getElementById('sync-time');
    const clearBtn = document.getElementById('btn-clear-sync');
    const syncBtn = document.getElementById('btn-sync-now');
    if (r && r.path) {
      el.textContent = '同步目录: ' + r.path;
      el.style.color = 'var(--fg)';
      if (r.lastSync) {
        timeEl.textContent = '上次同步: ' + formatTime(r.lastSync);
        timeEl.style.display = 'block';
      } else {
        timeEl.style.display = 'none';
      }
      clearBtn.style.display = 'inline-block';
      syncBtn.style.display = 'inline-block';
    } else {
      el.textContent = '未设置';
      el.style.color = 'var(--dim)';
      timeEl.style.display = 'none';
      clearBtn.style.display = 'none';
      syncBtn.style.display = 'inline-block';
    }
  } catch {}
}
let syncModalResolve = null;
document.getElementById('sync-cancel')?.addEventListener('click', () => {
  closeWithAnimation(document.getElementById('sync-modal'));
  if (syncModalResolve) { syncModalResolve(null); syncModalResolve = null; }
});
document.getElementById('sync-overlay')?.addEventListener('click', () => {
  closeWithAnimation(document.getElementById('sync-modal'));
  if (syncModalResolve) { syncModalResolve(null); syncModalResolve = null; }
});
document.getElementById('sync-use-local')?.addEventListener('click', () => {
  closeWithAnimation(document.getElementById('sync-modal'));
  if (syncModalResolve) { syncModalResolve('local'); syncModalResolve = null; }
});
document.getElementById('sync-import-cloud')?.addEventListener('click', () => {
  closeWithAnimation(document.getElementById('sync-modal'));
  if (syncModalResolve) { syncModalResolve('import'); syncModalResolve = null; }
});
document.getElementById('btn-select-sync-dir')?.addEventListener('click', async () => {
  try {
    const r = await window.electron.invoke('select-sync-directory');
    if (!r.path) return;
    const info = await window.electron.invoke('get-sync-info', { path: r.path });
    if (info.hasCloudSave) {
      // Show compare modal
      document.getElementById('sync-local-name').textContent = info.local.playerName;
      document.getElementById('sync-cloud-name').textContent = info.cloud.playerName;
      document.getElementById('sync-local-time').textContent = formatTime(info.local.lastWriteTimestamp);
      document.getElementById('sync-cloud-time').textContent = formatTime(info.cloud.lastWriteTimestamp);
      document.getElementById('sync-local-lv').textContent = 'Lv.' + info.local.hubLevel;
      document.getElementById('sync-cloud-lv').textContent = 'Lv.' + info.cloud.hubLevel;
      document.getElementById('sync-modal').classList.remove('closing');
      document.getElementById('sync-modal').classList.remove('hidden');
      const action = await new Promise(resolve => { syncModalResolve = resolve; });
      if (!action) return; // cancelled
      const cr = await window.electron.invoke('confirm-sync-directory', { path: r.path, action });
      if (cr.success && cr.imported) {
        const full = await window.electron.invoke('get-full-state');
        gameState = full.game;
        hubLevel = full.hubLevel || 1;
        currentScenario = full.scenario;
        currentTitle = full.currentTitle;
        updateUI();
        if (gameState.is_in_hub) renderHubView();
      }
    } else {
      await window.electron.invoke('confirm-sync-directory', { path: r.path, action: 'local' });
    }
    refreshSyncStatus();
    showToast('同步目录已设置', 'info');
  } catch { showToast('设置同步目录失败', 'error'); }
});
document.getElementById('btn-sync-now')?.addEventListener('click', async () => {
  try {
    const r = await window.electron.invoke('sync-now');
    if (r.success) {
      if (r.imported) {
        const full = await window.electron.invoke('get-full-state');
        gameState = full.game;
        hubLevel = full.hubLevel || 1;
        currentScenario = full.scenario;
        currentTitle = full.currentTitle;
        updateUI();
        if (gameState.is_in_hub) renderHubView();
      }
      refreshSyncStatus();
      showToast('同步完成', 'info');
    } else {
      showToast('同步失败: ' + (r.error || ''), 'error');
    }
  } catch { showToast('同步失败', 'error'); }
});
document.getElementById('btn-clear-sync')?.addEventListener('click', async () => {
  try {
    await window.electron.invoke('clear-sync');
    refreshSyncStatus();
    showToast('已取消同步', 'info');
  } catch { showToast('取消失败', 'error'); }
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
    // 渐变背景变量 --g1/--g2 由 bg 派生，避免背景渐变失效
    document.documentElement.style.setProperty('--g1', ct.bg);
    document.documentElement.style.setProperty('--g2', ct.dim);
  }
}
function renderScenarioPanel() {
  scenarioListEl.innerHTML = ''; const cid = gameState?.scenario_id;
  window.electron.invoke('get-archived-scenarios').then(archivedIds => {
    const archivedSet = new Set(archivedIds || []);
      scenarioList.filter(s => !archivedSet.has(s.id)).forEach(s => {
        const card = document.createElement('div'); card.className = `scenario-card${s.id === cid ? ' active' : ''}`;
        const sNameDiv = document.createElement('div'); sNameDiv.className = 'scenario-name'; sNameDiv.style.color = s.id === cid ? '#0F0' : '#888';
        sNameDiv.textContent = `${s.nameCN} (${s.name})`;
        if (s.isUserMade) { const tagSpan = document.createElement('span'); tagSpan.className = 'user-made-tag'; tagSpan.textContent = t('labelUserMade'); sNameDiv.appendChild(tagSpan); }
        card.appendChild(sNameDiv);
        const sDescDiv = document.createElement('div'); sDescDiv.className = 'scenario-desc';
        sDescDiv.textContent = s.description; card.appendChild(sDescDiv);
        const sStatsDiv = document.createElement('div'); sStatsDiv.className = 'scenario-stats';
        sStatsDiv.textContent = `${s.eventCount} ${t('scenarioEvent')}${s.achievementCount ? ' · ' + s.achievementCount + ' ' + t('scenarioAchievement') : ''}`;
        card.appendChild(sStatsDiv);
        card.addEventListener('click', async () => { const r = await selectWorld(s.id); if (r) scenarioPanel.classList.add('hidden'); });
        scenarioListEl.appendChild(card);
      });
    }).catch(() => {
      scenarioList.forEach(s => {
        const card = document.createElement('div'); card.className = `scenario-card${s.id === cid ? ' active' : ''}`;
        const sNameDiv = document.createElement('div'); sNameDiv.className = 'scenario-name'; sNameDiv.style.color = s.id === cid ? '#0F0' : '#888';
        sNameDiv.textContent = `${s.nameCN} (${s.name})`;
        if (s.isUserMade) { const tagSpan = document.createElement('span'); tagSpan.className = 'user-made-tag'; tagSpan.textContent = t('labelUserMade'); sNameDiv.appendChild(tagSpan); }
        card.appendChild(sNameDiv);
        const sDescDiv = document.createElement('div'); sDescDiv.className = 'scenario-desc';
        sDescDiv.textContent = s.description; card.appendChild(sDescDiv);
        const sStatsDiv = document.createElement('div'); sStatsDiv.className = 'scenario-stats';
        sStatsDiv.textContent = `${s.eventCount} ${t('scenarioEvent')}${s.achievementCount ? ' · ' + s.achievementCount + ' ' + t('scenarioAchievement') : ''}`;
        card.appendChild(sStatsDiv);
        card.addEventListener('click', async () => { const r = await selectWorld(s.id); if (r) scenarioPanel.classList.add('hidden'); });
        scenarioListEl.appendChild(card);
      });
  });
}
document.getElementById('btn-close').addEventListener('click', () => window.electron.invoke('hide-window'));
scenarioClose.addEventListener('click', () => closeWithAnimation(scenarioPanel));
titlesClose.addEventListener('click', () => closeWithAnimation(titlesPanel));
achievementClose.addEventListener('click', () => closeWithAnimation(achievementPanel));

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
      const condStr = a.condition.type === 'hub_level' ? `宠物 Lv.${a.condition.value}` : a.condition.type === 'completions' ? `通关 ${a.condition.value} 个世界` : a.condition.type === 'completions_half' ? '通关一半世界' : a.condition.type === 'completions_all' ? '通关所有世界' : a.condition.type === 'rebirths' ? `重生 ${a.condition.value} 次` : '';
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
  if (!id) { achievementListEl.innerHTML += '<div class="hub-empty-text">请先进入世界</div>'; return; }
  try {
    const d = await window.electron.invoke('get-scenario-detail', { id });
    if (!d || !d.achievements) return;
    const unlocked = gameState?.unlockedAchievements || [];
    d.achievements.forEach(a => {
      const u = unlocked.includes(a.id);
      const it = document.createElement('div'); it.className = `title-item${u ? '' : ' locked'}`;
      const condStr = a.condition.type === 'level' ? `Lv.${a.condition.value}` : a.condition.type === 'runtime' ? `挂机${Math.max(1, Math.floor(a.condition.value / 60000))}分钟` : a.condition.type === 'events' ? `触发${a.condition.value}事件` : `解锁${a.condition.value}称号`;
      it.innerHTML = `<span class="title-name" style="color:${u ? 'var(--fg)' : 'var(--dim)'}">${u ? a.name : '???'}</span><span class="title-desc">${u ? a.desc : condStr}</span>`;
      achievementListEl.appendChild(it);
    });
  } catch (e) { showToast(t('systemDetailFail'), 'error'); }
}

async function renderEventPanel() {
  eventListEl.innerHTML = '<div class="skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
  try {
    const entries = await window.electron.invoke('get-log-entries', {});
    if (!entries || entries.length === 0) {
      eventListEl.innerHTML = '<div class="hub-empty-text">暂无事件记录</div>';
      return;
    }
    let currentTitle = null;
    let currentLevel = 0;
    const chapters = {};
    const titleOrder = [];
    const prologueKey = '__prologue__';
    let hasPrologue = false;
    for (const e of entries) {
      const titleMatch = e.m.match(/等级\s*(\d+)\s*[!！]\s*([^\s—\-―]+)/);
      if (titleMatch) {
        currentLevel = parseInt(titleMatch[1]);
        currentTitle = titleMatch[2];
        if (!chapters[currentTitle]) {
          chapters[currentTitle] = { entries: [], minLevel: currentLevel, maxLevel: currentLevel };
          titleOrder.push(currentTitle);
        } else {
          if (currentLevel < chapters[currentTitle].minLevel) chapters[currentTitle].minLevel = currentLevel;
          if (currentLevel > chapters[currentTitle].maxLevel) chapters[currentTitle].maxLevel = currentLevel;
        }
        chapters[currentTitle].entries.push({ data: e, level: currentLevel });
      } else {
        // 升级之前的早期日志归入"序章"章节，不再丢弃
        if (!chapters[prologueKey]) {
          chapters[prologueKey] = { entries: [], minLevel: currentLevel, maxLevel: currentLevel };
          hasPrologue = true;
        }
        chapters[prologueKey].entries.push({ data: e, level: currentLevel });
      }
    }
    for (const ch of Object.values(chapters)) {
      ch.entries.sort((a, b) => (a.level || 0) - (b.level || 0));
    }
    titleOrder.sort((a, b) => chapters[a].minLevel - chapters[b].minLevel);
    let latestTitle = '';
    let highestLevel = 0;
    for (const t of titleOrder) {
      if (chapters[t].maxLevel > highestLevel) {
        highestLevel = chapters[t].maxLevel;
        latestTitle = t;
      }
    }
    eventListEl.innerHTML = '';
    const renderChapter = (title, displayName, isLatest) => {
      const ch = chapters[title];
      const range = ch.minLevel === ch.maxLevel ? `Lv.${ch.minLevel}` : `Lv.${ch.minLevel}-${ch.maxLevel}`;
      const grp = document.createElement('div'); grp.className = 'chapter-group';
      const hdr = document.createElement('div'); hdr.className = 'chapter-header';
      hdr.textContent = `${isLatest ? '▼ ' : '▶ '}${displayName} ${range}`;
      grp.appendChild(hdr);
      const body = document.createElement('div'); body.className = 'chapter-body' + (isLatest ? '' : ' hidden');
      for (const { data: e } of ch.entries) {
        const item = document.createElement('div'); item.className = 'log-entry ' + (e.ty || 'event');
        const tsStr = e.t && e.t.length >= 16 ? e.t.slice(11, 16) : (e.t || '');
        const ts = document.createElement('span'); ts.className = 'ts'; ts.textContent = `[${tsStr}]`;
        const msg = document.createElement('span'); msg.className = 'msg'; msg.textContent = e.m;
        item.appendChild(ts); item.appendChild(msg);
        body.appendChild(item);
      }
      grp.appendChild(body);
      hdr.addEventListener('click', () => {
        const hidden = body.classList.contains('hidden');
        if (hidden) {
          body.classList.remove('hidden');
          hdr.textContent = `▼ ${displayName} ${range}`;
        } else {
          body.classList.add('hidden');
          hdr.textContent = `▶ ${displayName} ${range}`;
        }
      });
      eventListEl.appendChild(grp);
    };
    if (hasPrologue) renderChapter(prologueKey, '序章', false);
    for (const title of titleOrder) {
      renderChapter(title, title, title === latestTitle);
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
      it.innerHTML = `<span class="title-name" style="color:var(--fg)">${sc ? sc.nameCN : c.scenarioId}</span><span class="title-desc">${tf('endingRecord', c.date, c.rebirthCount + 1, c.branch || '')}</span>`;
      endingPanelList.appendChild(it);
    });
  } catch (e) { endingPanelList.innerHTML = '<div class="hub-empty-text">加载失败</div>'; }
}

async function updateTooltip() {
  if (!gameState) return;
  const rt = formatRuntime(gameState.total_runtime_ms || 0);
  const title = currentTitle?.name || '?';
  const lv = gameState.is_in_hub ? `${t('hubLevel')}${hubLevel}` : `Lv.${gameState.level}`;
  const sc = currentScenario?.nameCN || (gameState.is_in_hub ? t('statusHub') : '?');
  try { await window.electron.invoke('update-tooltip', { text: `${gameState.player_name} | ${sc}\n${lv} | ${title} | ${rt}` }); } catch (e) {}
}

const onboardingModal = document.getElementById('onboarding-modal');
const onboardingInput = document.getElementById('onboarding-name');
const onboardingOk = document.getElementById('onboarding-ok');
let _obGenderSet = null;
document.querySelectorAll('.ob-gender-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const g = btn.dataset.gender;
    _obGenderSet = g;
    document.querySelectorAll('.ob-gender-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    try { await window.electron.invoke('set-pet-gender', { gender: g }); if (gameState) gameState.pet_gender = g === 'neutral' ? null : g; } catch {}
  });
});
onboardingOk.addEventListener('click', async () => {
  const n = onboardingInput.value.trim();
  if (n) { try { await window.electron.invoke('set-player-name', { name: n }); if (gameState) gameState.player_name = n; } catch {} }
  if (_obGenderSet) { try { await window.electron.invoke('set-pet-gender', { gender: _obGenderSet }); if (gameState) gameState.pet_gender = _obGenderSet === 'neutral' ? null : _obGenderSet; } catch {} }
  closeWithAnimation(onboardingModal);
  window.electron.invoke('set-onboarding-seen').catch(() => {});
  renderHubView(); renderHubCards(); updateUI();
});

// ── v4 更新说明弹窗（任务5）──
function closeChangelog() {
  closeWithAnimation(changelogModal);
  window.electron.invoke('mark-changelog-seen').catch(() => {});
}
changelogClose.addEventListener('click', closeChangelog);
changelogOk.addEventListener('click', closeChangelog);
changelogModal.addEventListener('click', (e) => { if (e.target === changelogModal || e.target === document.getElementById('changelog-overlay')) closeChangelog(); });
async function checkChangelog() {
  try {
    const info = await window.electron.invoke('get-changelog-info');
    if (info && info.show && info.changelog) {
      changelogTitleEl.textContent = tf('changelogTitle', info.changelog.version) + (info.changelog.title ? ' — ' + info.changelog.title : '');
      changelogPointsEl.innerHTML = (info.changelog.points || []).map((p, i) => `<div class="cl-point${/重置|清理/.test(p) ? ' warn' : ''}">${p}</div>`).join('');
      changelogModal.classList.remove('closing');
      changelogModal.classList.remove('hidden');
    }
  } catch {}
}

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
    showToast(`已加载 ${r.count} 个自制世界`, 'info');
  } catch { showToast('刷新失败', 'error'); }
});

bindCt('ct-fg'); bindCt('ct-bg'); bindCt('ct-dim'); bindCt('ct-border');

init().then(() => {
  document.title = `Idel-DreamMaker v${appVersion}`;
  const versionEl = document.getElementById('update-current-version');
  if (versionEl) versionEl.textContent = appVersion;
  applyTheme(gameState?.selected_font_theme || 'green');
  if (gameState && !gameState.is_in_hub) { switchView(false); addLog('system', tf('logStartScenario', formatRuntime(gameState.total_runtime_ms), gameState.level)); }
  updateUI(); updateTooltip(); setInterval(updateTooltip, 5000);
  loadWorldIndex();
  checkChangelog();

  // 首次启动自动弹出新手引导
  if (gameState && !gameState.has_seen_onboarding) {
    if (onboardingInput) onboardingInput.value = gameState.player_name || '';
    if (onboardingModal) { onboardingModal.classList.remove('closing'); onboardingModal.classList.remove('hidden'); }
  }

  // Load current scenario's events from persistence
  const sid = gameState?.scenario_id || gameState?.scenarioId;
  if (sid) {
    window.electron.invoke('get-log-entries', { scenario: sid }).then(entries => {
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
  }
});
