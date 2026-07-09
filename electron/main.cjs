const { app, ipcMain, Menu, dialog, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const { createMainWindow, getMainWindow } = require('./windows.cjs');
const { createTray, setToolTip, getTray, updateMenu } = require('./tray.cjs');
const { registerPetIpcHandlers, forwardToPet, initPet, broadcastTheme, setOnPetSelected } = require('./pet.cjs');
const { getTodaysHolidayId, getUpcomingHolidayId, getHolidayName, getHolidayIcon, getHolidayEventFromScenario, getRandomHolidayEvent } = require('./holiday.cjs');
const { parseScenarioMd } = require('../src/scenario-parser.cjs');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;
let tray = null;
let isQuitting = false;

const isMac = process.platform === 'darwin';
const SAVE_VERSION = 2;
let syncLogCounter = 0;

const HUB_TITLES = [
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

const HUB_ACHIEVEMENTS = [
  { id: 'hub_lv50', name: '初出茅庐', desc: '大厅等级达到 50', condition: { type: 'hub_level', value: 50 } },
  { id: 'hub_lv100', name: '百级之路', desc: '大厅等级达到 100', condition: { type: 'hub_level', value: 100 } },
  { id: 'hub_lv200', name: '两百之巅', desc: '大厅等级达到 200', condition: { type: 'hub_level', value: 200 } },
  { id: 'hub_lv300', name: '三百之峰', desc: '大厅等级达到 300', condition: { type: 'hub_level', value: 300 } },
  { id: 'hub_complete3', name: '集邮者', desc: '通关 3 个不同副本', condition: { type: 'completions', value: 3 } },
  { id: 'hub_half', name: '半数圆满', desc: '通关当前一半副本', condition: { type: 'completions_half', value: 0 } },
  { id: 'hub_all', name: '大圆满', desc: '通关所有副本', condition: { type: 'completions_all', value: 0 } },
  { id: 'hub_rebirth1', name: '重生者', desc: '任意副本重生 1 次', condition: { type: 'rebirths', value: 1 } },
  { id: 'hub_rebirth3', name: '轮回者', desc: '任意副本重生 3 次', condition: { type: 'rebirths', value: 3 } },
  { id: 'hub_complete5', name: '万界旅人', desc: '通关 5 个不同副本', condition: { type: 'completions', value: 5 } },
];

function getHubTitle(level) {
  let best = HUB_TITLES[0];
  for (const t of HUB_TITLES) {
    if (t.level <= level) best = t;
  }
  return best;
}

function checkHubAchievements() {
  if (!gameState) return [];
  const unlocked = [];
  const completionCount = (gameState.gameCompletions || []).filter((c, i, arr) => arr.findIndex(x => x.scenarioId === c.scenarioId) === i).length;
  const totalScenarios = allScenarios.length;
  const maxRebirth = Math.max(0, ...Object.values(gameState.rebirthCounts || {}));
  for (const a of HUB_ACHIEVEMENTS) {
    if (gameState.unlockedAchievements.includes(a.id)) continue;
    let met = false;
    switch (a.condition.type) {
      case 'hub_level': met = hubLevel >= a.condition.value; break;
      case 'completions': met = completionCount >= a.condition.value; break;
      case 'completions_half': met = totalScenarios > 0 && completionCount >= Math.ceil(totalScenarios / 2); break;
      case 'completions_all': met = totalScenarios > 0 && completionCount >= totalScenarios; break;
      case 'rebirths': met = maxRebirth >= a.condition.value; break;
    }
    if (met) {
      gameState.unlockedAchievements.push(a.id);
      unlocked.push(a);
    }
  }
  return unlocked;
}

function canArchiveScenario(scenarioId) {
  if (!gameState) return false;
  const scenario = findScenarioById(scenarioId);
  if (!scenario) return false;
  const hasCompleted = (gameState.gameCompletions || []).some(c => c.scenarioId === scenarioId);
  if (!hasCompleted) return false;
  const branches = scenario.branches || [];
  if (branches.length === 0) return true;
  const cb = gameState.completedBranches || [];
  return branches.every(b => cb.includes(b));
}

function setupAppMenu() {
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: '关于 Idel-DreamMaker' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    }] : []),
    {
      label: '文件',
      submenu: [
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'reload', label: '重新加载' },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

const APP_VERSION = (() => {
  try {
    if (app.isPackaged) return app.getVersion();
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    return pkg.version || '1.0.0';
  } catch { return '1.0.0'; }
})();

function createWindow() {
  mainWindow = createMainWindow(path.join(__dirname, 'preload.cjs'));

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:1420');
  }

  mainWindow._isQuitting = false;
  mainWindow.on('show', () => {
    forwardToPet('main-shown', {});
  });
  mainWindow.on('close', (e) => {
    if (!isQuitting && !mainWindow._isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
} 

function setupTray() {
  tray = createTray(mainWindow);
}

function getAppDataPath() {
  const base = app.getPath('appData');
  return path.join(base, 'Idel-DreamMaker');
}

function getLogDir() {
  const dir = path.join(getAppDataPath(), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

let _currentLogFile = null;
let _logCache = null;
let _logCacheMtime = 0;

function setLogSession(sessionId) {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
  _currentLogFile = path.join(getLogDir(), `${sessionId}_${ts}.log`);
}

function clearLogSession() {
  _currentLogFile = null;
}

function appendLogEntry(type, msg) {
  if (!_currentLogFile) return;
  try {
    const now = new Date();
    const entry = {
      t: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`,
      ty: type,
      m: msg,
    };
    fs.appendFileSync(_currentLogFile, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (e) { console.error('appendLogEntry error:', e); }
}

function _readAllLogFiles() {
  try {
    const dir = getLogDir();
    const logPath = path.join(dir, 'placeholder');
    let mtime = 0;
    try { mtime = fs.statSync(dir).mtimeMs; } catch {}
    if (_logCache && _logCacheMtime === mtime) return _logCache;
    if (!fs.existsSync(dir)) { _logCache = []; _logCacheMtime = mtime; return []; }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.log'));
    const all = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(dir, f), 'utf-8').trim();
        if (!content) continue;
        for (const line of content.split('\n')) {
          try { all.push(JSON.parse(line)); } catch {}
        }
      } catch {}
    }
    _logCache = all;
    _logCacheMtime = mtime;
    return all;
  } catch { return []; }
}

function getLogDates() {
  try {
    const entries = _readAllLogFiles();
    const dates = new Set();
    for (const e of entries) {
      if (e.t && e.t.length >= 10) dates.add(e.t.slice(0, 10));
    }
    return [...dates].sort();
  } catch { return []; }
}

function getLogEntries(date) {
  try {
    const entries = _readAllLogFiles();
    if (!date) return entries;
    return entries.filter(e => e.t && e.t.startsWith(date));
  } catch { return []; }
}

// ── IPC Handlers ──

function readSave() {
  try {
    const sp = path.join(getAppDataPath(), 'save.json');
    if (!fs.existsSync(sp)) {
      return null;
    }
    const gs = JSON.parse(fs.readFileSync(sp, 'utf-8'));
    // v3.0.0: clear old saves (pre-v2), start fresh
    if (!gs._version || gs._version < SAVE_VERSION) {
      // Delete old save, logs, and sync config to start clean
      try { fs.unlinkSync(sp); } catch {}
      try { const logDir = getLogDir(); if (fs.existsSync(logDir)) fs.rmSync(logDir, { recursive: true, force: true }); } catch {}
      try { const scp = getSyncConfigPath(); if (fs.existsSync(scp)) fs.unlinkSync(scp); } catch {}
      return null;
    }
    return gs;
  } catch { return null; }
}

function checkSyncOnStartup() {
  try {
    const cfg = readSyncConfig();
    if (!cfg || !cfg.path || !mainWindow) return;
    const cloudDir = path.join(cfg.path, 'Idel-DreamMaker-Sync');
    const syncSavePath = path.join(cloudDir, 'save.json');
    if (!fs.existsSync(syncSavePath)) return;
    const syncData = JSON.parse(fs.readFileSync(syncSavePath, 'utf-8'));
    const localTime = gameState?.lastWriteTimestamp || '';
    const syncTime = syncData.lastWriteTimestamp || '';
    if (!syncTime || syncTime <= localTime) return;
    const localTotal = (gameState?.hubTotalExp || 0) + (gameState?.totalExpEarned || 0);
    const cloudTotal = (syncData.hubTotalExp || 0) + (syncData.totalExpEarned || 0);
    if (cloudTotal < localTotal) return;
    // 设备信息
    const currentDevice = require('os').hostname();
    const cloudDevice = cfg.deviceId || '未知';
    const deviceNote = cloudDevice !== currentDevice ? `\n云端来源设备: ${cloudDevice}\n当前设备: ${currentDevice}` : '';
    const { dialog } = require('electron');
    const result = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      title: '发现云端存档',
      message: '检测到云端存档比本地更新，是否导入？',
      detail: `本地版本: ${localTime.slice(0, 19).replace('T', ' ')}\n云端版本: ${syncTime.slice(0, 19).replace('T', ' ')}${deviceNote}`,
      buttons: ['使用本地', '导入云端'],
      defaultId: 1,
    });
    if (result === 1) {
      // Import cloud save
      const imported = JSON.parse(fs.readFileSync(syncSavePath, 'utf-8'));
      Object.assign(gameState, imported);
      gameState._version = SAVE_VERSION;
      writeSave(gameState);
      // Sync logs back from cloud
      const cloudLogDir = path.join(cloudDir, 'logs');
      if (fs.existsSync(cloudLogDir)) {
        const localLogDir = getLogDir();
        if (!fs.existsSync(localLogDir)) fs.mkdirSync(localLogDir, { recursive: true });
        for (const f of fs.readdirSync(cloudLogDir).filter(f => f.endsWith('.log'))) {
          fs.copyFileSync(path.join(cloudLogDir, f), path.join(localLogDir, f));
        }
      }
      // Recalculate
      hubLevel = calcLevel(gameState.hubTotalExp);
      if (gameState.scenarioId && !gameState.isInHub) {
        currentScenario = findScenarioById(gameState.scenarioId);
        if (currentScenario) currentTitle = getCurrentTitle(currentScenario, gameState.level);
      }
    } else {
    }
  } catch {}
}

function getSyncConfigPath() {
  return path.join(getAppDataPath(), 'sync-config.json');
}

function readSyncConfig() {
  try {
    const p = getSyncConfigPath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch { return null; }
}

function writeSyncConfig(cfg) {
  try {
    fs.writeFileSync(getSyncConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8');
  } catch {}
}

function writeSave(data, silent) {
  try {
    data._version = SAVE_VERSION;
    data.lastWriteTimestamp = new Date().toISOString();
    const dir = getAppDataPath();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = path.join(dir, 'save.json.tmp');
    const finalPath = path.join(dir, 'save.json');
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, finalPath);
    const syncCfg = readSyncConfig();
    if (syncCfg && syncCfg.path) syncToCloud(syncCfg, silent);
  } catch (e) { console.error('Save failed:', e); appendLogEntry('error', `存档写入失败: ${e.message}`); }
}

function syncToCloud(cfg, silent) {
  try {
    const cloudDir = path.join(cfg.path, 'Idel-DreamMaker-Sync');
    if (!fs.existsSync(cloudDir)) fs.mkdirSync(cloudDir, { recursive: true });
    // 防回滚：云端存档更新时不覆盖
    const cloudSavePath = path.join(cloudDir, 'save.json');
    if (fs.existsSync(cloudSavePath)) {
      try {
        const cloudData = JSON.parse(fs.readFileSync(cloudSavePath, 'utf-8'));
        const localTime = gameState?.lastWriteTimestamp || '';
        const cloudTime = cloudData.lastWriteTimestamp || '';
        const localTotal = (gameState?.hubTotalExp || 0) + (gameState?.totalExpEarned || 0);
        const cloudTotal = (cloudData.hubTotalExp || 0) + (cloudData.totalExpEarned || 0);
        if (cloudTime > localTime && cloudTotal >= localTotal) {
          return;
        }
      } catch {}
    }
    // save.json
    const localSave = path.join(getAppDataPath(), 'save.json');
    if (fs.existsSync(localSave)) fs.copyFileSync(localSave, path.join(cloudDir, 'save.json'));
    // logs/
    const logDir = getLogDir();
    if (fs.existsSync(logDir)) {
      const cloudLogDir = path.join(cloudDir, 'logs');
      if (!fs.existsSync(cloudLogDir)) fs.mkdirSync(cloudLogDir, { recursive: true });
      for (const f of fs.readdirSync(logDir).filter(f => f.endsWith('.log'))) {
        fs.copyFileSync(path.join(logDir, f), path.join(cloudLogDir, f));
      }
    }
    // Update lastSync timestamp
    writeSyncConfig({ ...cfg, lastSync: new Date().toISOString() });
    syncLogCounter++;
  } catch (e) {}
}

// ── 存档完整性校验 ──
function validateSaveIntegrity() {
  try {
    if (!gameState) return 'gameState 为空';
    const issues = [];
    if (!gameState._version) issues.push('缺少 _version');
    if (!gameState.lastWriteTimestamp) issues.push('缺少 lastWriteTimestamp');
    if (!gameState.playerName) issues.push('playerName 为空');
    if (typeof gameState.level !== 'number' || gameState.level < 1) issues.push('level 异常');
    if (typeof gameState.exp !== 'number' || gameState.exp < 0) issues.push('exp 异常');
    if (typeof gameState.totalRuntimeMs !== 'number') issues.push('totalRuntimeMs 异常');
    if (gameState.isInHub === undefined) issues.push('isInHub 缺失');
    if (issues.length === 0) return '正常';
    return '问题: ' + issues.join(', ');
  } catch { return '校验异常'; }
}
function checkSaveFields(gs) {
  try {
    if (!gs) return { error: 'gameState 为空' };
    return {
      _version: { present: !!gs._version, value: gs._version },
      lastWriteTimestamp: { present: !!gs.lastWriteTimestamp, value: gs.lastWriteTimestamp },
      playerName: { present: !!gs.playerName, value: gs.playerName },
      level: { present: typeof gs.level === 'number', value: gs.level },
      exp: { present: typeof gs.exp === 'number', value: gs.exp },
      totalExpEarned: { present: typeof gs.totalExpEarned === 'number', value: gs.totalExpEarned },
      hubTotalExp: { present: typeof gs.hubTotalExp === 'number', value: gs.hubTotalExp },
      totalRuntimeMs: { present: typeof gs.totalRuntimeMs === 'number', value: gs.totalRuntimeMs },
      isInHub: { present: gs.isInHub !== undefined, value: gs.isInHub },
      totalKeyPresses: { present: typeof gs.totalKeyPresses === 'number', value: gs.totalKeyPresses },
      highestStreak: { present: typeof gs.highestStreak === 'number', value: gs.highestStreak },
      unlockedAchievements: { present: Array.isArray(gs.unlockedAchievements), count: (gs.unlockedAchievements || []).length },
      triggeredEvents: { present: Array.isArray(gs.triggeredEvents), count: (gs.triggeredEvents || []).length },
      gameCompletions: { present: Array.isArray(gs.gameCompletions), count: (gs.gameCompletions || []).length },
    };
  } catch { return { error: '校验异常' }; }
}

// Read scenarios data
function loadScenarios() {
  try {
    const jsonPath = path.join(__dirname, '..', 'public', 'scenarios_data.json');
    return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (e) {
    console.error('Failed to load scenarios:', e);
    return [];
  }
}

// Get scenarios_user directory (portable: next to exe; dev: project root)
function getScenariosUserDir() {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'scenarios_user');
  }
  return path.join(__dirname, '..', 'scenarios_user');
}

// Read user scenarios from scenarios_user/
function loadUserScenarios() {
  const userDir = getScenariosUserDir();
  if (!fs.existsSync(userDir)) {
    try { fs.mkdirSync(userDir, { recursive: true }); } catch {}
    return [];
  }
  const files = fs.readdirSync(userDir).filter(f => f.endsWith('.md')).sort();
  const loaded = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(userDir, file), 'utf-8');
      const scenario = parseScenarioMd(content);
      if (allScenarios.find(s => s.id === scenario.id)) {
        console.warn(`User scenario '${scenario.id}' in ${file} duplicates built-in ID, skipping`);
        continue;
      }
      scenario._userFile = file;
      loaded.push(scenario);
    } catch (e) {
      console.error(`Failed to parse user scenario ${file}: ${e.message}`);
    }
  }
  return loaded;
}

let allScenarios = [];
let gameState = null;
let currentScenario = null;
let currentTitle = null;
let hubLevel = 1;
let gameLoopInterval = null;
let tooltipInterval = null;

// ── Key Counter ──
const KEY_STREAK_WINDOW = 3000;
let keyStream = [];
let keyDown = {};
let comboMilestones = [];
let lastKeyChar = '';
let highestStreak = 0;

// ── Auto Updater ──
function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    try { mainWindow?.webContents.send('update-status', { type: 'checking' }); } catch {}
  });
  autoUpdater.on('update-available', (info) => {
    try { mainWindow?.webContents.send('update-status', { type: 'available', version: info.version }); } catch {}
  });
  autoUpdater.on('update-not-available', () => {
    try { mainWindow?.webContents.send('update-status', { type: 'not-available' }); } catch {}
  });
  autoUpdater.on('download-progress', (p) => {
    try { mainWindow?.webContents.send('update-status', { type: 'progress', percent: Math.round(p.percent), bytesPerSecond: p.bytesPerSecond }); } catch {}
  });
  autoUpdater.on('update-downloaded', () => {
    try { mainWindow?.webContents.send('update-status', { type: 'downloaded' }); } catch {}
    setTimeout(() => { try { autoUpdater.quitAndInstall(); } catch {} }, 2000);
  });
  autoUpdater.on('error', (e) => {
    try { mainWindow?.webContents.send('update-status', { type: 'error', message: e?.message || '更新出错' }); } catch {}
  });
}

const COMBO_GRADES = [
  { min: 40, grade: 'SSS' },
  { min: 25, grade: 'SS' },
  { min: 15, grade: 'S' },
  { min: 10, grade: 'A' },
  { min: 6, grade: 'B' },
  { min: 4, grade: 'C' },
  { min: 2, grade: 'D' },
];

function getGrade(streak) {
  for (const g of COMBO_GRADES) {
    if (streak >= g.min) return g.grade;
  }
  return null;
}

function getComboMultiplier(grade) {
  switch (grade) {
    case 'SSS': return 20;
    case 'SS': return 8;
    case 'S': return 5;
    case 'A': return 3;
    case 'B': return 2;
    case 'C': return 1.5;
    case 'D': return 1.2;
    default: return 1;
  }
}

let buffExpireTime = 0;
let buffMultiplier = 1;
let buffGradeTime = 0;
let buffCooldownUntil = 0;

// Build keycode → display name mapping from UiohookKey
const KEYCODE_TO_NAME = {};
for (const name in UiohookKey) {
  if (typeof name === 'string' && typeof UiohookKey[name] === 'number') {
    KEYCODE_TO_NAME[UiohookKey[name]] = name;
  }
}

function isNonPrintableKey(vk) {
  return false;
}

function handleInputDown(keyId, keyChar, now) {
  if (!gameState) return;
  if (keyDown[keyId]) return;
  keyDown[keyId] = true;

  gameState.totalKeyPresses = (gameState.totalKeyPresses || 0) + 1;
  gameState.dailyKeyPresses = (gameState.dailyKeyPresses || 0) + 1;

  lastKeyChar = keyChar;
  keyStream.push(now);
  keyStream = keyStream.filter(t => now - t <= KEY_STREAK_WINDOW);
  const streak = keyStream.length;
  if (streak > highestStreak) highestStreak = streak;
  const grade = getGrade(streak);

  if (grade && !gameState.comboMilestones) gameState.comboMilestones = [];
  if (grade && !gameState.comboMilestones.includes(grade)) {
    gameState.comboMilestones = [...gameState.comboMilestones, grade];
  }

  try { forwardToPet('key-combo', { streak, grade, keyChar, total: gameState.totalKeyPresses, daily: gameState.dailyKeyPresses }); } catch {}

  if (gameState.isInHub || gameState.pendingChoiceEvent) {
    if (gameState.pendingChoiceEvent) buffGradeTime = 0;
    return;
  }

  const mult = getComboMultiplier(grade);
  const keyExp = 1.0 * mult * (1 + (gameState.rebirthExpBonus || 0));
  gameState.exp = (gameState.exp || 0) + keyExp;
  gameState.totalExpEarned = (gameState.totalExpEarned || 0) + keyExp;

  const ol = gameState.level;
  gameState.level = calcLevel(gameState.totalExpEarned);
  if (gameState.level > ol) {
    const title = getCurrentTitle(currentScenario, gameState.level);
    const storyEvent = findUnusedEvent('story', gameState.level);
    if (storyEvent) gameState.triggeredEvents.push(storyEvent.id);
    if (title) {
      currentTitle = title;
      if (currentScenario) gameState.equippedTitleIndex = currentScenario.titles.indexOf(title);
    }
    if (storyEvent && storyEvent.choice1 && storyEvent.choice1Target) {
      const choices = buildChoices(storyEvent);
      gameState.pendingChoiceEvent = {
        eventId: storyEvent.id, scenarioId: gameState.scenarioId,
        title: '抉择', text: storyEvent.text, choices,
      };
      const choicePayload = { title: '抉择', text: storyEvent.text, choices, _eventId: storyEvent.id };
      try { mainWindow.webContents.send('choice-event', choicePayload); } catch {}
      forwardToPet('choice-event', choicePayload);
    }
    const luPayload = { level: gameState.level, title: title ? title.name : null, titleColor: title ? title.color : null, titleDesc: title ? title.desc : null, eventText: storyEvent && !storyEvent.choice1 ? storyEvent.text : null };
    try { mainWindow.webContents.send('level-up', luPayload); } catch {}
    forwardToPet('level-up', luPayload);
  }

  if (grade && Date.now() >= buffCooldownUntil) {
    if (!buffGradeTime) buffGradeTime = Date.now();
    if (!buffExpireTime && Date.now() - buffGradeTime >= 10000) {
      if (['A','S','SS','SSS'].includes(grade)) {
        buffMultiplier = 3;
        buffExpireTime = now + 120000;
      } else {
        buffMultiplier = 2;
        buffExpireTime = now + 60000;
      }
      const dur = buffExpireTime - now;
      forwardToPet('buff-triggered', { multiplier: buffMultiplier, duration: dur });
      buffGradeTime = 0;
    }
  } else if (!grade) {
    buffGradeTime = 0;
  }
}

function initInputListener() {
  try {
    uIOhook.on('keydown', (e) => {
      if (isNonPrintableKey(e.keycode)) return;
      handleInputDown(e.keycode, KEYCODE_TO_NAME[e.keycode] || '?', Date.now());
    });
    uIOhook.on('keyup', (e) => {
      keyDown[e.keycode] = false;
    });
    uIOhook.on('mousedown', (e) => {
      if (e.button < 1 || e.button > 3) return;
      const keyId = 'mouse_' + e.button;
      const keyChar = e.button === 1 ? '🖱L' : e.button === 2 ? '🖱R' : '🖱M';
      handleInputDown(keyId, keyChar, Date.now());
    });
    uIOhook.on('mouseup', (e) => {
      if (e.button < 1 || e.button > 3) return;
      keyDown['mouse_' + e.button] = false;
    });
    uIOhook.start();
  } catch (e) {
    console.error('Failed to init input listener:', e);
  }
}

function resetDailyIfNewDay() {
  if (!gameState) return;
  const today = new Date().toISOString().slice(0, 10);
  if (gameState.keyPressDate !== today) {
    gameState.dailyKeyPresses = 0;
    gameState.keyPressDate = today;
  }
}

// ── Game Logic ──

function calcLevel(exp) {
  if (exp <= 0) return 1;
  if (exp <= 980100) return Math.floor(Math.sqrt(exp / 100)) + 1;
  // LV100+ 等差数列：首项 4000，每级递增 10
  const r = exp - 980100;
  return 100 + Math.floor((-3995 + Math.sqrt(15960025 + 20 * r)) / 10);
}

function calcExpForLevel(level) {
  if (level <= 1) return 0;
  if (level <= 100) return 100 * (level - 1) * (level - 1);
  // LV100+ 等差数列反推
  const n = level - 100;
  return 980100 + n * (2 * 4000 + (n - 1) * 10) / 2;
}

function getCurrentTitle(scenario, level) {
  if (!scenario || !scenario.titles) return null;
  let best = null;
  for (const t of scenario.titles) {
    if (t.level <= level) best = t;
  }
  return best;
}

function getUnlockedTitles(scenario, level) {
  if (!scenario || !scenario.titles) return [];
  return scenario.titles.filter(t => t.level <= level);
}

function findScenarioById(id) {
  return allScenarios.find(s => s.id === id) || null;
}

function resetGameForScenario(scenario, alias) {
  gameState.scenarioId = scenario.id;
  const p = gameState.scenarioProgress && gameState.scenarioProgress[scenario.id];
  if (p) {
    gameState.totalExpEarned = p.totalExpEarned || 0;
    gameState.level = calcLevel(gameState.totalExpEarned);
    gameState.exp = gameState.totalExpEarned;
    gameState.totalRuntimeMs = p.totalRuntimeMs || 0;
    gameState.triggeredEvents = p.triggeredEvents ? [...p.triggeredEvents] : [];
    gameState.unlockedAchievements = p.unlockedAchievements ? [...p.unlockedAchievements] : [];
    gameState.equippedTitleIndex = p.equippedTitleIndex || 0;
  } else {
    gameState.level = 1;
    gameState.exp = 0;
    gameState.totalExpEarned = 0;
    gameState.totalRuntimeMs = 0;
    gameState.triggeredEvents = [];
    gameState.unlockedAchievements = [];
    gameState.equippedTitleIndex = 0;
  }
  gameState.isInHub = false;
  gameState.scenarioAlias = alias || '';
  currentScenario = scenario;

  // Trigger story event for current level (catches level 1 on first entry)
  const initEvent = findUnusedEvent('story', gameState.level);
  if (initEvent) {
    gameState.triggeredEvents.push(initEvent.id);
    const title = getCurrentTitle(currentScenario, gameState.level);
    // Choice detection
    if (initEvent.choice1 && initEvent.choice1Target) {
      const choices = buildChoices(initEvent);
      gameState.pendingChoiceEvent = {
        eventId: initEvent.id, scenarioId: gameState.scenarioId,
        title: '抉择', text: initEvent.text, choices,
      };
      const cp = { title: '抉择', text: initEvent.text, choices, _eventId: initEvent.id };
      try { mainWindow.webContents.send('choice-event', cp); } catch {}
      forwardToPet('choice-event', cp);
    }
    const luPayload = { level: gameState.level, title: title?.name || '', titleColor: title?.color || '#888', titleDesc: title?.desc || '', eventText: initEvent.choice1 ? null : initEvent.text };
    try { mainWindow.webContents.send('level-up', luPayload); } catch {}
    forwardToPet('level-up', luPayload);
  }
  setLogSession(scenario.id);
}

function exitToHub() {
  clearLogSession();
  const unlocked = getUnlockedTitles(currentScenario, gameState.level).map(t => t.name);
  const sid = gameState.scenarioId;
  if (sid) {
    if (!gameState.unlockedTitleSets) gameState.unlockedTitleSets = {};
    gameState.unlockedTitleSets[sid] = unlocked;

    // Save progress: only add delta exp to hub to avoid double counting
    const prevProgress = gameState.scenarioProgress && gameState.scenarioProgress[sid];
    const prevExp = prevProgress ? prevProgress.totalExpEarned : 0;
    const delta = gameState.totalExpEarned - prevExp;
    gameState.hubTotalExp += Math.max(0, delta);

    gameState.scenarioProgress[sid] = {
      totalExpEarned: gameState.totalExpEarned,
      totalRuntimeMs: gameState.totalRuntimeMs,
      triggeredEvents: [...gameState.triggeredEvents],
      unlockedAchievements: [...gameState.unlockedAchievements],
      equippedTitleIndex: gameState.equippedTitleIndex,
    };
  }

  gameState.scenarioId = '';
  gameState.isInHub = true;
  hubLevel = calcLevel(gameState.hubTotalExp);
}

function checkFlagRequire(flagRequire) {
  if (!flagRequire) return true;
  const flags = gameState.flags || {};
  const parts = flagRequire.split('&');
  for (const part of parts) {
    const orParts = part.split('|');
    let anyMatch = false;
    for (const op of orParts) {
      const trimmed = op.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^([a-zA-Z_]\w*)\s*(>|>=|==|<=|<|=)\s*(.+)$/);
      if (!match) return false;
      const [, key, opStr, valStr] = match;
      const val = isNaN(Number(valStr)) ? valStr : Number(valStr);
      const flagVal = flags[key];
      if (flagVal === undefined) continue;
      switch (opStr) {
        case '=': case '==': if (flagVal == val) anyMatch = true; break;
        case '>': if (flagVal > val) anyMatch = true; break;
        case '>=': if (flagVal >= val) anyMatch = true; break;
        case '<': if (flagVal < val) anyMatch = true; break;
        case '<=': if (flagVal <= val) anyMatch = true; break;
      }
    }
    if (!anyMatch) return false;
  }
  return true;
}

function applyFlagSet(flagSet) {
  if (!flagSet) return;
  if (!gameState.flags) gameState.flags = {};
  const parts = flagSet.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([a-zA-Z_]\w*)\s*(\+=|-=|=)\s*(.+)$/);
    if (!match) continue;
    const [, key, op, valStr] = match;
    const val = isNaN(Number(valStr)) ? valStr : Number(valStr);
    if (typeof val === 'number') {
      if (op === '+=') gameState.flags[key] = (gameState.flags[key] || 0) + val;
      else if (op === '-=') gameState.flags[key] = (gameState.flags[key] || 0) - val;
      else gameState.flags[key] = val;
    } else {
      gameState.flags[key] = val;
    }
  }
}

function buildChoices(storyEvent) {
  const choices = [];
  if (storyEvent.choice1 && storyEvent.choice1Target) choices.push({ text: storyEvent.choice1, target: storyEvent.choice1Target });
  if (storyEvent.choice2 && storyEvent.choice2Target) choices.push({ text: storyEvent.choice2, target: storyEvent.choice2Target });
  if (storyEvent.choice3 && storyEvent.choice3Target) choices.push({ text: storyEvent.choice3, target: storyEvent.choice3Target });
  if (storyEvent.choice4 && storyEvent.choice4Target) choices.push({ text: storyEvent.choice4, target: storyEvent.choice4Target });
  return choices;
}

function findUnusedEvent(type, level) {
  if (!currentScenario || !currentScenario.events || gameState.isInHub) return null;
  const cb = gameState.currentBranch || '';
  const pool = currentScenario.events.filter(e => {
    if (e.type && e.type !== type) return false;
    if (e.minLevel && e.minLevel > level) return false;
    if (e.once && gameState.triggeredEvents.includes(e.id)) return false;
    if (e.branch && e.branch !== '' && e.branch !== cb) return false;
    if (!checkFlagRequire(e.flagRequire)) return false;
    return true;
  });
  if (pool.length === 0) return null;
  return pool[0];
}

function checkHolidayEvent() {
  if (!currentScenario || !currentScenario.events || gameState.isInHub) return null;
  const todayHoliday = getTodaysHolidayId();
  const upcomingHoliday = !todayHoliday ? getUpcomingHolidayId() : null;
  const holidayInfo = todayHoliday || upcomingHoliday;
  if (!holidayInfo) return null;
  const holidayKey = 'holiday_' + holidayInfo.id + '_' + holidayInfo.type;
  if (gameState.triggeredEvents.includes(holidayKey)) return null;
  const he = getHolidayEventFromScenario(currentScenario, holidayInfo.id, holidayInfo.type);
  if (!he) return null;
  gameState.triggeredEvents.push(holidayKey);
  return { id: holidayKey, title: he.holidayName, color: '#FFD700', text: he.text, isHoliday: true };
}

const MILESTONES = [
  { ms: 3600000,      id: 'ms_1h',   text: '你已经挂机1小时了。' },
  { ms: 21600000,     id: 'ms_6h',   text: '半天过去了，你继续着自己的事。' },
  { ms: 86400000,     id: 'ms_24h',  text: '满一天了，时间过得真快。' },
  { ms: 259200000,    id: 'ms_3d',   text: '已经三天了，你渐渐习惯了这样的生活。' },
  { ms: 604800000,    id: 'ms_7d',   text: '满一周了，七天已成周。' },
  { ms: 2592000000,   id: 'ms_30d',  text: '一个月了，你还在这里。' },
  { ms: 8640000000,   id: 'ms_100d', text: '一百天了，百日如百载。' },
  { ms: 31536000000,  id: 'ms_365d', text: '一年了，感谢你的陪伴。' },
];

function checkMilestones() {
  if (!currentScenario || gameState.isInHub) return null;
  for (const m of MILESTONES) {
    if (gameState.totalRuntimeMs >= m.ms && !gameState.triggeredEvents.includes(m.id)) {
      gameState.triggeredEvents.push(m.id);
      return { id: m.id, title: '里程碑', color: '#FFD700', text: m.text };
    }
  }
  return null;
}

function checkAchievements() {
  if (!currentScenario || !currentScenario.achievements || gameState.isInHub) {
    return [];
  }

  const unlocked = [];
  for (const a of currentScenario.achievements) {
    if (gameState.unlockedAchievements.includes(a.id)) continue;
    let met = false;
    switch (a.condition.type) {
      case 'level':
        met = gameState.level >= a.condition.value;
        break;
      case 'runtime':
        met = gameState.totalRuntimeMs >= a.condition.value;
        break;
      case 'events':
        met = gameState.triggeredEvents.length >= a.condition.value;
        break;
      case 'titles':
        met = getUnlockedTitles(currentScenario, gameState.level).length >= a.condition.value;
        break;
    }
    if (met) {
      gameState.unlockedAchievements.push(a.id);
      unlocked.push(a);
    }
  }
  return unlocked;
}

function allScenariosFullyCompleted() {
  if (!allScenarios || allScenarios.length === 0) return false;
  return allScenarios.every(s => {
    const hasCompletion = (gameState.gameCompletions || []).some(c => c.scenarioId === s.id);
    if (!hasCompletion) return false;
    return canArchiveScenario(s.id);
  });
}

let hubIdleMs = 0;
let lastHubReminderMs = 0;

const TICK_MS = 500;

function startGameLoop() {
  if (gameLoopInterval) return;
  hubIdleMs = 0;
  lastHubReminderMs = 0;

  const HUB_REMINDERS = [
    '大厅的挂钟滴答作响，空气中有一丝茶香。',
    '窗外似乎有什么东西一闪而过。',
    '墙上的地图又多了几道你不记得画过的痕迹。',
    '壁炉里的火苗轻轻跳动着。',
    '角落里那把旧椅子看起来比上次更旧了。',
    '在大厅挂机不涨经验，进副本才有。',
    '已经在大厅待了好一会儿，不选个副本开始吗？',
    '副本才是挂机的地方——选一个进去吧。',
    '在大厅不会有事件触发，副本里才有故事。',
    '大厅只能管理和浏览，经验在副本里。',
  ];

  gameLoopInterval = setInterval(() => {
    if (!gameState) return;

    resetDailyIfNewDay();

    const delta = TICK_MS;

    // Send game tick regardless of hub/scenario
    const payload = {
      player_name: gameState.playerName,
      scenario_id: gameState.scenarioId,
      level: gameState.level,
      exp: gameState.exp,
      total_exp_earned: gameState.totalExpEarned,
      total_runtime_ms: gameState.totalRuntimeMs,
      equipped_title_index: gameState.equippedTitleIndex,
      is_in_hub: gameState.isInHub,
      hub_total_exp: gameState.hubTotalExp,
      unlockedAchievements: gameState.unlockedAchievements,
      triggered_events: gameState.triggeredEvents,
      language: gameState.language,
      currentTitle: currentTitle ? currentTitle.name : null,
      scenario_name: currentScenario ? (currentScenario.name_cn || currentScenario.nameCN || currentScenario.name) : null,
      theme: gameState.selectedFontTheme || 'green',
      custom_theme: gameState.customTheme || null,
      hub_level: calcLevel(gameState.hubTotalExp),
      current_branch: gameState.currentBranch || '',
      completed_branches: gameState.completedBranches || [],
      flags: gameState.flags || {},
      mechanic: currentScenario ? (currentScenario.mechanic || 'standard') : 'standard',
      hub_title: gameState?.equippedCompletionTitle?.title || getHubTitle(hubLevel).name,
      total_key_presses: gameState.totalKeyPresses || 0,
      daily_key_presses: gameState.dailyKeyPresses || 0,
      buff_multiplier: buffMultiplier,
      buff_remaining: buffExpireTime ? Math.max(0, buffExpireTime - Date.now()) : 0,
    };
    try { mainWindow.webContents.send('game-tick', payload); } catch {}
    forwardToPet('game-tick', payload);
    forwardToPet('pet-state', { hubLevel: calcLevel(gameState.hubTotalExp), isInHub: gameState.isInHub, level: gameState.level });

    if (gameState.isInHub) {
      if (!allScenariosFullyCompleted()) {
        hubIdleMs += delta;
        if (hubIdleMs >= 300000 && hubIdleMs - lastHubReminderMs >= 900000) {
          lastHubReminderMs = hubIdleMs;
          const text = HUB_REMINDERS[Math.floor(Math.random() * HUB_REMINDERS.length)];
          const reminderPayload = { id: 'hub_reminder', title: '提醒', color: '#FFA500', text };
          try { mainWindow.webContents.send('event-triggered', reminderPayload); } catch {}
          forwardToPet('event-triggered', reminderPayload);
        }
      }
      return;
    }

    // Pending choice blocks all progress
    if (gameState.pendingChoiceEvent) return;

    // Catch-up mode: wait for user to close bubble before sending next
    if (gameState._catchUpQueue && gameState._catchUpQueue.length > 0) {
      if (gameState._catchUpBlocked) return;
      const next = gameState._catchUpQueue.shift();
      gameState._catchUpBlocked = true;
      if (next.choice1 && next.choice1Target) {
        gameState.pendingChoiceEvent = {
          eventId: next.id, scenarioId: gameState.scenarioId,
          title: '抉择', text: next.text, choices: buildChoices(next),
        };
        const cp = { title: '抉择', text: next.text, choices: buildChoices(next), _eventId: next.id };
        try { mainWindow.webContents.send('choice-event', cp); } catch {}
        forwardToPet('choice-event', cp);
      } else {
        const evPayload = { id: next.id, title: '事件', color: '#00BFFF', text: next.text };
        try { mainWindow.webContents.send('event-triggered', evPayload); } catch {}
        forwardToPet('event-triggered', evPayload);
      }
      return;
    }

    gameState.totalRuntimeMs += delta;
    let expMultiplier = 1;
    const mechanic = currentScenario?.mechanic || 'standard';
    if (mechanic === 'cultivation') {
      const hour = new Date().getHours();
      expMultiplier = (hour >= 6 && hour < 18) ? 1.5 : 0.7;
    } else if (mechanic === 'cyber') {
      // 5% 概率故障：每 10 分钟检查一次
      const tenMinBlock = Math.floor(gameState.totalRuntimeMs / 600000);
      const cyberKey = 'cyber_fault_' + tenMinBlock;
      if (!gameState.triggeredEvents.includes(cyberKey) && Math.random() < 0.05) {
        gameState.triggeredEvents.push(cyberKey);
        gameState.cyberFaultUntil = Date.now() + 30000;  // 暂停 30 秒
      }
      if (gameState.cyberFaultUntil && Date.now() < gameState.cyberFaultUntil) {
        expMultiplier = 0;  // 故障中
      } else if (gameState.cyberFaultUntil && Date.now() >= gameState.cyberFaultUntil) {
        gameState.cyberCompensateUntil = Date.now() + 60000;  // 补偿 60 秒 2x
        gameState.cyberFaultUntil = null;
      }
      if (gameState.cyberCompensateUntil && Date.now() < gameState.cyberCompensateUntil) {
        expMultiplier = 2;
      } else if (gameState.cyberCompensateUntil) {
        gameState.cyberCompensateUntil = null;
      }
    } else if (mechanic === 'tide') {
      // 每 6 小时周期，前 10 分钟 2x
      const sixHourBlock = Math.floor(gameState.totalRuntimeMs / 21600000);
      const blockProgress = gameState.totalRuntimeMs % 21600000;
      if (blockProgress < 600000) expMultiplier = 2;  // 前 10 分钟
    } else if (mechanic === 'polar') {
      // 现实季节：夏季正常，冬季 0.5x
      const month = new Date().getMonth();
      if (month >= 11 || month <= 2) expMultiplier = 0.5;  // 12-2 月冬季
    }
    const expGain = (delta / 1000) * expMultiplier * buffMultiplier * (1 + (gameState.rebirthExpBonus || 0));
    gameState.exp += expGain;
    gameState.totalExpEarned += expGain;

    // Buff expiry check
    if (buffExpireTime && Date.now() >= buffExpireTime) {
      buffExpireTime = 0;
      buffMultiplier = 1;
      buffCooldownUntil = Date.now() + 30000;
    }

    // Level up check — merge with story event
    const oldLevel = gameState.level;
    gameState.level = calcLevel(gameState.totalExpEarned);
    if (gameState.level > oldLevel) {
      // If there's a pending choice, skip story event — choice must be resolved first
      if (gameState.pendingChoiceEvent) {
        const title = getCurrentTitle(currentScenario, gameState.level);
        if (title) { currentTitle = title; gameState.equippedTitleIndex = currentScenario.titles.indexOf(title); }
        const luPayload = { level: gameState.level, title: title ? title.name : null, titleColor: title ? title.color : null, titleDesc: title ? title.desc : null, eventText: null };
        try { mainWindow.webContents.send('level-up', luPayload); } catch {}
        forwardToPet('level-up', luPayload);
        return;
      }
      const title = getCurrentTitle(currentScenario, gameState.level);
      const storyEvent = findUnusedEvent('story', gameState.level);
      if (storyEvent) gameState.triggeredEvents.push(storyEvent.id);
      if (title) {
        currentTitle = title;
        gameState.equippedTitleIndex = currentScenario.titles.indexOf(title);
      }
      // Check if this is a choice event
      if (storyEvent && storyEvent.choice1 && storyEvent.choice1Target) {
        const choices = buildChoices(storyEvent);
        gameState.pendingChoiceEvent = { eventId: storyEvent.id, scenarioId: gameState.scenarioId, title: '抉择', text: storyEvent.text, choices };
        const choicePayload = { title: '抉择', text: storyEvent.text, choices, _eventId: storyEvent.id };
        try { mainWindow.webContents.send('choice-event', choicePayload); } catch {}
        forwardToPet('choice-event', choicePayload);
      }
      const luPayload = { level: gameState.level, title: title ? title.name : null, titleColor: title ? title.color : null, titleDesc: title ? title.desc : null, eventText: storyEvent && !storyEvent.choice1 ? storyEvent.text : null };
      try { mainWindow.webContents.send('level-up', luPayload); } catch {}
      forwardToPet('level-up', luPayload);
    }

    // Ending check — LV500 triggers scenario ending
    if (gameState.level >= 500 && !gameState.triggeredEvents.includes('scenario_ending_' + gameState.scenarioId)) {
      gameState.triggeredEvents.push('scenario_ending_' + gameState.scenarioId);
      // Find ending event by flag require
      const storyEvents = currentScenario.events.filter(e => e.type === 'story' && checkFlagRequire(e.flagRequire));
      const endingEvent = storyEvents[storyEvents.length - 1] || currentScenario.events.filter(e => e.type === 'story')[storyEvents.length - 1];
      // Record completion for this branch
      const cb = gameState.currentBranch || '';
      if (!gameState.completedBranches) gameState.completedBranches = [];
      if (!gameState.completedBranches.includes(cb)) gameState.completedBranches.push(cb);
      // Unlock branch completion title (from ending event's completionTitle)
      const endingTitle = endingEvent?.completionTitle || currentScenario.completion_title;
      if (endingTitle) {
        if (!gameState.unlockedCompletionTitles) gameState.unlockedCompletionTitles = [];
        if (!gameState.unlockedCompletionTitles.find(c => c.scenarioId === gameState.scenarioId && c.title === endingTitle)) {
          gameState.unlockedCompletionTitles.push({
            scenarioId: gameState.scenarioId,
            scenarioName: currentScenario.name_cn || currentScenario.nameCN || currentScenario.name,
            title: endingTitle,
            branch: cb,
          });
        }
      }
      const endingPayload = {
        scenarioId: gameState.scenarioId,
        scenarioName: currentScenario.name_cn || currentScenario.nameCN || currentScenario.name,
        text: endingEvent ? endingEvent.text : '你的旅程已达终点。',
        endingTitle: endingTitle || '',
        branch: cb,
      };
      try { mainWindow.webContents.send('scenario-ending', endingPayload); } catch {}
      // 首次通关解锁永久成就
      const completionAchId = 'completion_' + gameState.scenarioId;
      if (!gameState.unlockedAchievements.includes(completionAchId)) {
        gameState.unlockedAchievements.push(completionAchId);
        const achPayload = { id: completionAchId, name: '圆满', desc: (currentScenario.name_cn || currentScenario.nameCN) + '·圆满', icon: '★' };
        try { mainWindow.webContents.send('achievement-unlocked', achPayload); } catch {}
        forwardToPet('achievement-unlocked', achPayload);
      }
      // 记录通关
      if (!gameState.gameCompletions) gameState.gameCompletions = [];
      const existingIdx = gameState.gameCompletions.findIndex(c => c.scenarioId === gameState.scenarioId);
      if (existingIdx === -1) {
        gameState.gameCompletions.push({ scenarioId: gameState.scenarioId, date: new Date().toISOString().slice(0,10), rebirthCount: (gameState.rebirthCounts && gameState.rebirthCounts[gameState.scenarioId]) || 0, branch: cb });
      }
      // 检查大厅成就
      checkHubAchievements();
    }

    // Milestone check
    const milestone = checkMilestones();
    if (milestone) {
      const evPayload = { id: milestone.id, title: milestone.title, color: milestone.color, text: milestone.text };
      try { mainWindow.webContents.send('event-triggered', evPayload); } catch {}
      forwardToPet('event-triggered', evPayload);
    }

    // Holiday event check (roughly every ~60s)
    if (Math.random() < delta / 60000) {
      const holidayEvent = checkHolidayEvent();
      if (holidayEvent) {
        const evPayload = { id: holidayEvent.id, title: holidayEvent.title, color: holidayEvent.color, text: holidayEvent.text };
        try { mainWindow.webContents.send('event-triggered', evPayload); } catch {}
        forwardToPet('event-triggered', evPayload);
      }
    }

    // Daily login ritual (once per day)
    if (!gameState.isInHub && currentScenario) {
      const today = new Date().toISOString().slice(0, 10);
      if (gameState.lastLoginDay !== today) {
        gameState.lastLoginDay = today;
        const ritualPayload = {
          id: 'daily_ritual_' + today,
          title: '新的一日',
          color: '#FFD700',
          text: '新的一天开始了。你抖落身上的尘土，准备继续你的旅程。',
        };
        forwardToPet('event-triggered', ritualPayload);
      }
    }

    // Achievement check
    const newAchievements = checkAchievements();
    for (const a of newAchievements) {
      const achPayload = { id: a.id, name: a.name, desc: a.desc, icon: a.icon || '★' };
      try { mainWindow.webContents.send('achievement-unlocked', achPayload); } catch {}
      forwardToPet('achievement-unlocked', achPayload);
    }

    // Hub achievement check
    const hubAchievements = checkHubAchievements();
    for (const a of hubAchievements) {
      const achPayload = { id: a.id, name: a.name, desc: a.desc, icon: '★' };
      try { mainWindow.webContents.send('achievement-unlocked', achPayload); } catch {}
      forwardToPet('achievement-unlocked', achPayload);
    }

    // Auto-save every 30s
    if (gameState.totalRuntimeMs % 30000 < delta) {
      writeSave(gameState, true);
      try { mainWindow.webContents.send('auto-save', {}); } catch {}
    }
  }, 500);
}

function stopGameLoop() {
  if (gameLoopInterval) {
    clearInterval(gameLoopInterval);
    gameLoopInterval = null;
  }
}

// ── IPC Registration ──

function registerIpcHandlers() {
  ipcMain.handle('get-full-state', () => {
    if (!gameState) return null;
    const currentTitleData = currentTitle || (currentScenario ? { name: currentScenario.playerTitle, color: '#888', desc: '' } : null);
    return {
      game: {
        player_name: gameState.playerName,
        scenario_id: gameState.scenarioId,
        level: gameState.level,
        exp: gameState.exp,
        total_exp_earned: gameState.totalExpEarned,
        total_runtime_ms: gameState.totalRuntimeMs,
        equipped_title_index: gameState.equippedTitleIndex,
        is_in_hub: gameState.isInHub,
        hub_total_exp: gameState.hubTotalExp,
        language: gameState.language,
        ai_output_language: gameState.aiOutputLanguage || 'zh',
        selected_font_theme: gameState.selectedFontTheme || 'green',
        custom_theme: gameState.customTheme || null,
        scenario_alias: gameState.scenarioAlias || '',
        unlocked_title_sets: gameState.unlockedTitleSets || {},
        scenario_progress: gameState.scenarioProgress || {},
        triggered_events: gameState.triggeredEvents || [],
        unlockedAchievements: gameState.unlockedAchievements || [],
        has_seen_onboarding: gameState.hasSeenOnboarding || false,
        pet_selected_index: gameState.petSelectedIndex || 0,
      },
      hubLevel: hubLevel,
      scenario: currentScenario ? {
        id: currentScenario.id,
        name: currentScenario.name,
        nameCN: currentScenario.name_cn || currentScenario.nameCN,
        description: currentScenario.description,
        playerTitle: currentScenario.playerTitle || currentScenario.player_title,
      } : null,
      currentTitle: currentTitleData,
      appVersion: APP_VERSION,
    };
  });

  ipcMain.handle('get-scenario-list', () => {
    return allScenarios.map(s => ({
      id: s.id,
      name: s.name,
      nameCN: s.name_cn || s.nameCN,
      description: s.description,
      playerTitle: s.playerTitle || s.player_title,
      titleCount: s.titles ? s.titles.length : 0,
      eventCount: s.events ? s.events.length : 0,
      achievementCount: s.achievements ? s.achievements.length : 0,
      isUserMade: !!s._userFile,
    }));
  });

  ipcMain.handle('set-player-name', (_, { name }) => {
    gameState.playerName = name;
    return true;
  });

  ipcMain.handle('select-scenario', (_, { id, alias }) => {
    // 如果当前正在副本内，先保存当前副本进度再切换
    if (!gameState.isInHub && gameState.scenarioId && gameState.scenarioId !== id) {
      try { forwardToPet('dismiss-choice', {}); } catch {}
      const oldSid = gameState.scenarioId;
      if (!gameState.scenarioProgress) gameState.scenarioProgress = {};
      const prevExp = gameState.scenarioProgress[oldSid]?.totalExpEarned || 0;
      const delta = gameState.totalExpEarned - prevExp;
      gameState.hubTotalExp += Math.max(0, delta);
      gameState.scenarioProgress[oldSid] = {
        totalExpEarned: gameState.totalExpEarned,
        totalRuntimeMs: gameState.totalRuntimeMs,
        triggeredEvents: [...gameState.triggeredEvents],
        unlockedAchievements: [...gameState.unlockedAchievements],
        equippedTitleIndex: gameState.equippedTitleIndex,
        choiceFlags: gameState.choiceFlags ? { ...gameState.choiceFlags[oldSid] } : undefined,
      };
    }
    // 点的是当前副本，不做任何事（仅当在副本内时触发）
    if (!gameState.isInHub && id === gameState.scenarioId) {
      return { game: { ...gameState, is_in_hub: false }, scenario: currentScenario ? { id: currentScenario.id, name: currentScenario.name, nameCN: currentScenario.name_cn || currentScenario.nameCN, playerTitle: currentScenario.playerTitle || currentScenario.player_title, titles: currentScenario.titles } : null };
    }
    const scenario = findScenarioById(id);
    if (!scenario) throw new Error(`Scenario '${id}' not found`);
    const aliasStr = alias || '';
    resetGameForScenario(scenario, aliasStr);
    // Catch-up: queue story events up to current level for old saves
    const catchUpLevel = gameState.level;
    if (catchUpLevel > 1 && scenario.events) {
      // Collect all IDs that are choice targets, so we don't pre-show them
      const allTargetIds = new Set();
      scenario.events.forEach(e => {
        if (e.choice1Target) allTargetIds.add(e.choice1Target);
        if (e.choice2Target) allTargetIds.add(e.choice2Target);
        if (e.choice3Target) allTargetIds.add(e.choice3Target);
        if (e.choice4Target) allTargetIds.add(e.choice4Target);
      });
      let queue = scenario.events.filter(e => e.type === 'story' && e.minLevel <= catchUpLevel && !allTargetIds.has(e.id));
      queue.sort((a, b) => a.minLevel - b.minLevel);
      if (queue.length > 0) {
        gameState._catchUpQueue = queue;
        gameState._catchUpBlocked = false;
        // Inject exp to bypass normal level-up triggers during catch-up
        const expForLevel = calcExpForLevel(catchUpLevel);
        gameState.totalExpEarned = expForLevel;
        gameState.exp = expForLevel;
        gameState.level = catchUpLevel;
      }
    }
    // Re-send pending choice if exists for this scenario
    if (gameState.pendingChoiceEvent && gameState.pendingChoiceEvent.scenarioId === scenario.id) {
      const pe = gameState.pendingChoiceEvent;
      const cp = { title: pe.title, text: pe.text, choices: pe.choices, _eventId: pe.eventId };
      try { mainWindow.webContents.send('choice-event', cp); } catch {}
      forwardToPet('choice-event', cp);
    }
    hubIdleMs = 0;
    lastHubReminderMs = 0;
    writeSave(gameState);
    try { mainWindow.webContents.send('scenario-changed', {
      game: {
        player_name: gameState.playerName,
        scenario_id: gameState.scenarioId,
        level: gameState.level,
        exp: gameState.exp,
        total_exp_earned: gameState.totalExpEarned,
        total_runtime_ms: gameState.totalRuntimeMs,
        equipped_title_index: gameState.equippedTitleIndex,
        is_in_hub: gameState.isInHub,
        hub_total_exp: gameState.hubTotalExp,
        language: gameState.language,
        ai_output_language: gameState.aiOutputLanguage || 'zh',
        selected_font_theme: gameState.selectedFontTheme || 'green',
        custom_theme: gameState.customTheme || null,
        scenario_alias: gameState.scenarioAlias || '',
        unlocked_title_sets: gameState.unlockedTitleSets || {},
        scenario_progress: gameState.scenarioProgress || {},
        triggered_events: gameState.triggeredEvents || [],
        unlockedAchievements: gameState.unlockedAchievements || [],
        has_seen_onboarding: gameState.hasSeenOnboarding || false,
        pet_selected_index: gameState.petSelectedIndex || 0,
      },
      scenario: {
        id: scenario.id,
        name: scenario.name,
        nameCN: scenario.name_cn || scenario.nameCN,
        description: scenario.description,
        playerTitle: scenario.playerTitle || scenario.player_title,
        titles: scenario.titles,
      },
    }); } catch {}
    return {
      game: {
        player_name: gameState.playerName,
        scenario_id: gameState.scenarioId,
        level: gameState.level,
        exp: gameState.exp,
        total_exp_earned: gameState.totalExpEarned,
        total_runtime_ms: gameState.totalRuntimeMs,
        equipped_title_index: gameState.equippedTitleIndex,
        is_in_hub: gameState.isInHub,
        hub_total_exp: gameState.hubTotalExp,
        language: gameState.language,
        ai_output_language: gameState.aiOutputLanguage || 'zh',
        selected_font_theme: gameState.selectedFontTheme || 'green',
        custom_theme: gameState.customTheme || null,
        scenario_alias: gameState.scenarioAlias || '',
        unlocked_title_sets: gameState.unlockedTitleSets || {},
        scenario_progress: gameState.scenarioProgress || {},
        triggered_events: gameState.triggeredEvents || [],
        unlockedAchievements: gameState.unlockedAchievements || [],
        has_seen_onboarding: gameState.hasSeenOnboarding || false,
        pet_selected_index: gameState.petSelectedIndex || 0,
      },
      scenario: {
        id: scenario.id,
        name: scenario.name,
        nameCN: scenario.name_cn || scenario.nameCN,
        description: scenario.description,
        playerTitle: scenario.playerTitle || scenario.player_title,
        titles: scenario.titles,
      },
    };
  });

  ipcMain.handle('exit-to-hub', () => {
    try { forwardToPet('dismiss-choice', {}); } catch {}
    exitToHub();
    writeSave(gameState);
    return { hubTotalExp: gameState.hubTotalExp, hubLevel: hubLevel };
  });

  ipcMain.handle('get-hub-titles', () => {
    if (!gameState) return [];
    return allScenarios.map(s => {
      const unlocked = (gameState.unlockedTitleSets && gameState.unlockedTitleSets[s.id]) || [];
      return {
        id: s.id,
        name: s.name,
        nameCN: s.name_cn || s.nameCN,
        unlockedCount: unlocked.length,
        totalCount: s.titles ? s.titles.length : 0,
        unlockedTitles: unlocked,
        equippedTitle: (gameState.hubEquippedTitles && gameState.hubEquippedTitles[s.id]) || null,
      };
    });
  });

  ipcMain.handle('set-title', (_, { index, scenarioId, name }) => {
    // Resolve target scenario: current scenario in-run, or specified scenario from hub titles
    let scenario = currentScenario;
    if (scenarioId) {
      scenario = findScenarioById(scenarioId) || scenario;
    }
    if (!scenario || !scenario.titles) {
      throw new Error('当前无副本，无法佩戴称号');
    }
    let realIndex = index;
    if (name !== undefined && name !== null) {
      // Hub title click passes name (not the real index in titles[])
      realIndex = scenario.titles.findIndex(t => t.name === name);
      if (realIndex === -1) throw new Error(`称号 '${name}' 未找到`);
    } else if (realIndex === undefined || realIndex === null || realIndex >= scenario.titles.length) {
      throw new Error('Title index out of bounds');
    }
    // Only allow equipping unlocked titles
    const target = scenario.titles[realIndex];
    if (target.level > gameState.level && !gameState.isInHub) {
      throw new Error('称号尚未解锁');
    }
    if (scenarioId && gameState.isInHub) {
      // Hub wearing: equip for that scenario, session-only (not persisted to save.json equippedTitleIndex)
      if (!gameState.unlockedTitleSets) gameState.unlockedTitleSets = {};
      const unlocked = (gameState.unlockedTitleSets[scenarioId] || []);
      if (!unlocked.includes(target.name)) throw new Error('称号尚未解锁');
      // Remember hub-equipped title name for this scenario (session)
      if (!gameState.hubEquippedTitles) gameState.hubEquippedTitles = {};
      gameState.hubEquippedTitles[scenarioId] = target.name;
    } else if (scenario === currentScenario) {
      gameState.equippedTitleIndex = realIndex;
      currentTitle = target;
    }
    return { name: target.name, color: target.color, desc: target.desc };
  });

  ipcMain.handle('set-onboarding-seen', () => {
    gameState.hasSeenOnboarding = true;
    writeSave(gameState);
    return true;
  });

  // Language is locked to zh-CN only

  ipcMain.handle('set-font-theme', (_, { theme }) => {
    gameState.selectedFontTheme = theme;
    broadcastTheme(theme, gameState.customTheme);
    return true;
  });

  ipcMain.handle('set-custom-theme', (_, { fg, bg, dim, border }) => {
    gameState.selectedFontTheme = 'custom';
    gameState.customTheme = { fg, bg, dim, border };
    broadcastTheme('custom', gameState.customTheme);
    return true;
  });

  ipcMain.handle('hide-window', () => {
    if (mainWindow) mainWindow.hide();
    return true;
  });

  ipcMain.handle('start-dragging', () => {
    // In Electron, window dragging is handled by -webkit-app-region: drag CSS
    return true;
  });

  ipcMain.handle('set-window-mode', (_, { mode }) => {
    if (!mainWindow) return;
    if (mode === 'mini') {
      mainWindow.setMinimumSize(0, 0);
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setSize(250, 80);
    } else if (mode === 'full') {
      mainWindow.setMinimumSize(280, 400);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setSize(320, 840);
      mainWindow.center();
    }
    return true;
  });

  ipcMain.handle('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
    return true;
  });

  ipcMain.handle('window-toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return true;
  });

  ipcMain.handle('set-window-position', (_, { x, y }) => {
    if (mainWindow) mainWindow.setPosition(x, y);
    return true;
  });

  ipcMain.handle('update-tooltip', (_, { text }) => {
    setToolTip(text);
    return true;
  });

  ipcMain.handle('get-scenario-detail', (_, { id }) => {
    const s = findScenarioById(id);
    if (!s) throw new Error(`Scenario '${id}' not found`);
    return {
      id: s.id,
      name: s.name,
      nameCN: s.name_cn || s.nameCN,
      description: s.description,
      playerTitle: s.playerTitle || s.player_title,
      titles: s.titles,
      achievements: s.achievements,
    };
  });

  ipcMain.handle('set-scenario-progress', (_, { scenarioId, progress }) => {
    if (!gameState.scenarioProgress) gameState.scenarioProgress = {};
    gameState.scenarioProgress[scenarioId] = progress;
    writeSave(gameState);
    return true;
  });

  ipcMain.handle('get-current-theme', () => {
    return { theme: gameState?.selectedFontTheme || 'green', customTheme: gameState?.customTheme || null };
  });

  // ── User Scenarios ──
  ipcMain.handle('open-github-repo', () => {
    const { shell } = require('electron');
    shell.openExternal('https://github.com/sandsand244263/idel-dream-maker');
    return { success: true };
  });

  ipcMain.handle('open-user-scenarios-folder', () => {
    const userDir = getScenariosUserDir();
    if (!fs.existsSync(userDir)) { try { fs.mkdirSync(userDir, { recursive: true }); } catch {} }
    const { shell } = require('electron');
    shell.openPath(userDir);
    return { success: true };
  });

  ipcMain.handle('refresh-user-scenarios', () => {
    const userDir = getScenariosUserDir();
    if (!fs.existsSync(userDir)) { try { fs.mkdirSync(userDir, { recursive: true }); } catch {} }
    const newUserScenarios = loadUserScenarios();
    const builtInIds = new Set(loadScenarios().map(s => s.id));
    allScenarios = allScenarios.filter(s => !s._userFile || builtInIds.has(s.id));
    allScenarios.push(...newUserScenarios);
    try {
      const list = allScenarios.map(s => ({
        id: s.id, name: s.name, nameCN: s.name_cn || s.nameCN,
        description: s.description, playerTitle: s.playerTitle || s.player_title,
        titleCount: s.titles ? s.titles.length : 0,
        eventCount: s.events ? s.events.length : 0,
        achievementCount: s.achievements ? s.achievements.length : 0,
        isUserMade: !!s._userFile,
      }));
      mainWindow.webContents.send('scenario-list-updated', list);
    } catch {}
    return { count: newUserScenarios.length };
  });

  ipcMain.handle('add-log-entry', (_, { type, msg }) => {
    if (type === 'system') return true;
    appendLogEntry(type, msg);
    return true;
  });

  ipcMain.handle('get-log-dates', () => {
    return getLogDates();
  });

  ipcMain.handle('get-log-entries', (_, { date }) => {
    return getLogEntries(date);
  });

  // ── Rebirth (choose another branch) ──
  ipcMain.handle('rebirth-scenario', (_, { scenarioId }) => {
    const sid = scenarioId || gameState.scenarioId;
    if (!sid) return { success: false, error: '无副本ID' };
    // 检查所有分支是否已走完
    const scenario = findScenarioById(sid);
    const branches = scenario?.branches || [];
    const cb = gameState.completedBranches || [];
    if (branches.length > 0 && cb.length >= branches.length) {
      return { success: false, error: '所有分支已探索' };
    }
    // 增加重生次数（保留在原字段以兼容）
    if (!gameState.rebirthCounts) gameState.rebirthCounts = {};
    gameState.rebirthCounts[sid] = (gameState.rebirthCounts[sid] || 0) + 1;
    // 计算总重生次数（所有副本）
    const totalRebirths = Object.values(gameState.rebirthCounts).reduce((a, b) => a + b, 0);
    // 经验加成：每次 +10%，封顶 +50%（保留）
    gameState.rebirthExpBonus = Math.min(1.0, totalRebirths * 0.25);
    // 清空该副本进度
    if (gameState.scenarioProgress) delete gameState.scenarioProgress[sid];
    // 保留通关记录（不删）
    // 重置副本内状态
    gameState.level = 1;
    gameState.exp = 0;
    gameState.totalExpEarned = 0;
    gameState.totalRuntimeMs = 0;
    gameState.triggeredEvents = [];
    gameState.currentBranch = '';
    gameState.flags = {};
    gameState.pendingChoiceEvent = null;
    gameState._catchUpQueue = null;
    gameState._catchUpPaused = false;
    // 返回大厅
    gameState.scenarioId = '';
    gameState.isInHub = true;
    currentScenario = null;
    currentTitle = null;
    hubLevel = calcLevel(gameState.hubTotalExp);
    writeSave(gameState);
    return { success: true, hubLevel, rebirthExpBonus: gameState.rebirthExpBonus };
  });

  // ── Hub titles ──
  ipcMain.handle('get-hub-title', () => {
    return getHubTitle(hubLevel);
  });

  // ── Hub achievements list ──
  ipcMain.handle('get-hub-achievements', () => {
    const unlocked = gameState?.unlockedAchievements || [];
    return HUB_ACHIEVEMENTS.map(a => ({
      id: a.id,
      name: a.name,
      desc: a.desc,
      icon: '★',
      unlocked: unlocked.includes(a.id),
      condition: a.condition,
    }));
  });

  // ── Completion titles ──
  ipcMain.handle('get-hub-completion-titles', () => {
    return {
      unlocked: gameState?.unlockedCompletionTitles || [],
      equipped: gameState?.equippedCompletionTitle || null,
    };
  });

  ipcMain.handle('set-completion-title', (_, { scenarioId }) => {
    if (!gameState.unlockedCompletionTitles) return { success: false };
    const found = gameState.unlockedCompletionTitles.find(c => c.scenarioId === scenarioId);
    if (!found) return { success: false, error: '未解锁' };
    if (gameState.equippedCompletionTitle?.scenarioId === scenarioId) {
      gameState.equippedCompletionTitle = null;
    } else {
      gameState.equippedCompletionTitle = { scenarioId, title: found.title };
    }
    writeSave(gameState);
    return { success: true, equipped: gameState.equippedCompletionTitle };
  });

  // ── Hub stats ──
  ipcMain.handle('get-hub-stats', () => {
    const completions = (gameState.gameCompletions || []).filter((c, i, arr) => arr.findIndex(x => x.scenarioId === c.scenarioId) === i);
    const archived = gameState.archivedScenarios || [];
    const activeTotal = allScenarios.filter(s => !archived.includes(s.id)).length;
    return {
      hubLevel,
      hubTitle: { name: gameState?.equippedCompletionTitle?.title || getHubTitle(hubLevel).name },
      completionCount: completions.length,
      totalScenarios: activeTotal,
      completions: completions,
    };
  });

  // ── Scenario unlock check ──
  ipcMain.handle('get-scenario-unlocks', () => {
    const completionCount = (gameState.gameCompletions || []).filter((c, i, arr) => arr.findIndex(x => x.scenarioId === c.scenarioId) === i).length;
    const archived = gameState.archivedScenarios || [];
    return allScenarios.map(s => {
      const req = s.unlock_requirement || {};
      const hubOk = !req.hub_level || hubLevel >= req.hub_level;
      const compOk = !req.completions || completionCount >= req.completions;
      const unlocked = hubOk && compOk;
      return {
        id: s.id,
        unlocked,
        requirement: req,
        hubLevel: hubLevel,
        completionCount,
        archived: archived.includes(s.id),
        canArchive: canArchiveScenario(s.id),
      };
    });
  });

  // ── Archive ──
  ipcMain.handle('archive-scenario', (_, { scenarioId }) => {
    if (!canArchiveScenario(scenarioId)) return { success: false, error: '未满足归档条件（需通关所有周目）' };
    if (!gameState.archivedScenarios) gameState.archivedScenarios = [];
    if (!gameState.archivedScenarios.includes(scenarioId)) {
      gameState.archivedScenarios.push(scenarioId);
      writeSave(gameState);
    }
    return { success: true };
  });

  ipcMain.handle('unarchive-scenario', (_, { scenarioId }) => {
    gameState.archivedScenarios = (gameState.archivedScenarios || []).filter(id => id !== scenarioId);
    writeSave(gameState);
    return { success: true };
  });

  ipcMain.handle('get-archived-scenarios', () => {
    return gameState.archivedScenarios || [];
  });

  // ── All-complete prompt ──
  ipcMain.handle('get-all-complete-prompt', () => {
    const total = allScenarios.length;
    if (total === 0) return { show: false };
    const dismissedAt = gameState.promptDismissedAtScenarioCount;
    if (dismissedAt === total) return { show: false };
    const completions = (gameState.gameCompletions || []).filter((c, i, arr) => arr.findIndex(x => x.scenarioId === c.scenarioId) === i).length;
    return { show: completions >= total, totalCount: total, completedCount: completions };
  });

  ipcMain.handle('dismiss-all-complete-prompt', () => {
    gameState.promptDismissedAtScenarioCount = allScenarios.length;
    writeSave(gameState);
    return true;
  });

  // ── Export / feedback ──
  ipcMain.handle('export-logs-to-desktop', () => {
    try {
      // 桌面路径：app.getPath + 双重 fallback
      let desktop;
      try { desktop = app.getPath('desktop'); } catch {}
      if (!desktop) desktop = path.join(require('os').homedir(), 'Desktop');
      if (!fs.existsSync(desktop)) desktop = require('os').homedir();
      const ts = new Date();
      const dateStr = ts.toISOString().slice(0,10);
      const timeStr = `${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}`;
      const exportDir = path.join(desktop, `IdelDreamMaker-Debug-${dateStr}_${timeStr}`);
      fs.mkdirSync(exportDir, { recursive: true });

      // 1. Copy log files
      const logDir = getLogDir();
      let logCount = 0, logSize = 0;
      if (fs.existsSync(logDir)) {
        fs.readdirSync(logDir).forEach(f => {
          const src = path.join(logDir, f);
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, path.join(exportDir, f));
            logCount++;
            logSize += fs.statSync(src).size;
          }
        });
      }

      // 2. Copy save file
      const savePath = path.join(getAppDataPath(), 'save.json');
      if (fs.existsSync(savePath)) fs.copyFileSync(savePath, path.join(exportDir, 'save.json'));

      // 3. Build diagnostic report
      const isInHub = gameState.isInHub;
      const hubExp = gameState.hubTotalExp || 0;
      const scenarioExp = gameState.totalExpEarned || 0;
      const totalExp = hubExp + scenarioExp;
      const gameLevel = gameState.level || 1;
      const syncCfg = readSyncConfig();

      // 3a. Sync comparison (if configured)
      let syncInfo = '未配置同步';
      if (syncCfg && syncCfg.path) {
        const cloudSavePath = path.join(syncCfg.path, 'Idel-DreamMaker-Sync', 'save.json');
        if (fs.existsSync(cloudSavePath)) {
          try {
            const cloudData = JSON.parse(fs.readFileSync(cloudSavePath, 'utf-8'));
            const cloudTotal = (cloudData.hubTotalExp || 0) + (cloudData.totalExpEarned || 0);
            const cloudLevel = calcLevel(cloudData.hubTotalExp || 0);
            syncInfo = [
              `同步目录: ${syncCfg.path}`,
              `上次同步: ${syncCfg.lastSync || '未知'}`,
              `设备ID: ${syncCfg.deviceId || '未知'}`,
              `云端玩家: ${cloudData.playerName || '未知'}`,
              `云端大厅等级: ${cloudLevel}`,
              `云端总经验: ${cloudTotal}`,
              `本地总经验: ${totalExp}`,
              `经验差: ${totalExp - cloudTotal}`,
            ].join('\n');
          } catch {}
        } else {
          syncInfo = `同步目录已配置但云端存档不存在\n路径: ${syncCfg.path}`;
        }
      }

      // 3b. Error log
      const errorLogPath = path.join(getAppDataPath(), 'errors.log');
      let errorHistory = '无';
      if (fs.existsSync(errorLogPath)) {
        const lines = fs.readFileSync(errorLogPath, 'utf-8').split('\n').filter(l => l.trim()).slice(-20);
        if (lines.length > 0) errorHistory = lines.join('\n');
      }

      // 3c. Log stats
      const logDates = getLogDates();

      // 3d. Completed scenarios
      const completions = gameState.gameCompletions || [];
      const uniqueCompletions = completions.filter((c,i,a) => a.findIndex(x=>x.scenarioId===c.scenarioId)===i);

      // Build report text
      const reportHeader = `===== Idel-DreamMaker Debug 诊断报告 =====\n生成时间: ${ts.toLocaleString('zh-CN')}\n应用版本: v${APP_VERSION} | 存档版本: v${SAVE_VERSION}\n${'='.repeat(50)}\n`;

      const systemSection = [
        `--- 1. 系统环境 ---`,
        `操作系统: ${process.platform} ${process.arch}`,
        `系统语言: ${process.env.LANG || process.env.LC_ALL || '(未设置)'}`,
        `Node.js: ${process.version}`,
        `Electron: ${process.versions.electron}`,
        `Chrome: ${process.versions.chrome}`,
        `桌面路径(解析后): ${desktop}`,
        `AppData: ${getAppDataPath()}`,
        `日志目录: ${logDir}`,
        `日志文件数: ${logCount}`,
        `日志总大小: ${(logSize / 1024).toFixed(1)} KB`,
        `屏幕分辨率: ${mainWindow ? mainWindow.getContentBounds() : 'N/A'}`,
      ].join('\n');

      const saveSection = [
        `--- 2. 存档状态 ---`,
        `最后写入: ${gameState.lastWriteTimestamp || '无'}`,
        `玩家名称: ${gameState.playerName || '无'}`,
        `大厅等级: ${hubLevel}`,
        `大厅经验: ${hubExp}`,
        `副本内等级: ${gameLevel}`,
        `副本内经验: ${gameState.exp || 0}`,
        `总经验(大厅+副本): ${totalExp}`,
        `运行总时长: ${Math.floor((gameState.totalRuntimeMs || 0) / 1000 / 60)} 分钟`,
        `已通关数: ${uniqueCompletions.length}`,
        `成就解锁: ${(gameState.unlockedAchievements || []).length}`,
        `称号解锁: ${Object.values(gameState.unlockedTitleSets || {}).reduce((a,b) => a + (Array.isArray(b) ? b.length : 0), 0) || 0}`,
        `总按键: ${gameState.totalKeyPresses || 0}`,
        `最高连击: ${gameState.highestStreak || 0}`,
        `存档完整性: ${validateSaveIntegrity()}`,
      ].join('\n');

      const runtimeSection = [
        `--- 3. 运行时状态 ---`,
        `是否在大厅: ${isInHub}`,
        `当前副本: ${gameState.scenarioId || '无'}`,
        `待决选择事件: ${gameState.pendingChoiceEvent ? `是(eventId=${gameState.pendingChoiceEvent.eventId})` : '无'}`,
        `激活Buff: ${Date.now() < buffExpireTime ? `倍数=${buffMultiplier}` : '无'}`,
        `今日按键: ${gameState.dailyKeyPresses || 0}`,
        `副本列表: ${allScenarios.length} 个`,
      ].join('\n');

      const syncSection = [
        `--- 4. 同步诊断 ---`,
        syncInfo,
      ].join('\n');

      const errorSection = [
        `--- 5. 错误历史 (最近20条) ---`,
        errorHistory,
      ].join('\n');

      const report = [reportHeader, systemSection, '', saveSection, '', runtimeSection, '', syncSection, '', errorSection].join('\n');
      fs.writeFileSync(path.join(exportDir, '诊断报告.txt'), report, 'utf-8');

      // 4. Save validation
      const validation = {
        ts: ts.toISOString(),
        appVersion: APP_VERSION,
        saveVersion: SAVE_VERSION,
        fields: checkSaveFields(gameState),
      };
      fs.writeFileSync(path.join(exportDir, '存档校验.json'), JSON.stringify(validation, null, 2), 'utf-8');

      return { success: true, path: exportDir };
    } catch (e) {
      appendLogEntry('error', `诊断包导出失败: ${e.message}`);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('open-log-folder', () => {
    try {
      const { shell } = require('electron');
      shell.openPath(getLogDir());
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle('open-path', (_, { path: targetPath }) => {
    try {
      const { shell } = require('electron');
      shell.openPath(targetPath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ── Key stats ──
  // ── Choice events ──
  ipcMain.handle('choice-selected', (_, { eventId, choiceIndex }) => {
    console.log('[main-choice] received eventId:', eventId, 'choiceIndex:', choiceIndex, 'pending:', gameState.pendingChoiceEvent?.eventId);
    if (!gameState.pendingChoiceEvent || gameState.pendingChoiceEvent.eventId !== eventId) {
      return { success: false, error: '无待决选择' };
    }
    const pe = gameState.pendingChoiceEvent;
    const choice = pe.choices[choiceIndex];
    if (!choice) return { success: false, error: '无效选项' };
    // Record the choice
    if (!gameState.choiceFlags) gameState.choiceFlags = {};
    if (!gameState.choiceFlags[pe.scenarioId]) gameState.choiceFlags[pe.scenarioId] = {};
    gameState.choiceFlags[pe.scenarioId][pe.eventId] = choiceIndex === 0 ? 'choice1' : 'choice2';
    // Fire target event
    if (choice.target) {
      const targetEvent = currentScenario && currentScenario.events.find(e => e.id === choice.target);
      if (targetEvent && !gameState.triggeredEvents.includes(targetEvent.id)) {
        gameState.triggeredEvents.push(targetEvent.id);
        // Set current branch from target event's branch
        if (targetEvent.branch && targetEvent.branch !== '') gameState.currentBranch = targetEvent.branch;
        // Apply flag set from target event
        applyFlagSet(targetEvent.flagSet);
        const evPayload = { id: targetEvent.id, title: '事件', color: '#00BFFF', text: targetEvent.text };
        try { mainWindow.webContents.send('event-triggered', evPayload); } catch {}
        forwardToPet('event-triggered', evPayload);
      }
    }
    gameState.pendingChoiceEvent = null;
    // Resume catch-up: choice handled, unblock to send next
    if (gameState._catchUpBlocked) gameState._catchUpBlocked = false;
    writeSave(gameState);
    return { success: true, choiceFlag: gameState.choiceFlags[pe.scenarioId]?.[pe.eventId] };
  });

  // ── Catch-up advance (called when user dismisses a bubble in catch-up mode) ──
  ipcMain.handle('catch-up-advance', () => {
    if (gameState._catchUpBlocked) gameState._catchUpBlocked = false;
    return true;
  });

  ipcMain.handle('get-key-stats', () => {
    if (!gameState) return { total: 0, daily: 0, milestones: [] };
    const grade = getGrade(keyStream.length);
    return {
      total: gameState.totalKeyPresses || 0,
      daily: gameState.dailyKeyPresses || 0,
      streak: keyStream.length,
      grade,
      keyChar: lastKeyChar,
      highestStreak,
      milestones: gameState.comboMilestones || [],
    };
  });

  // ── Sync ──
  ipcMain.handle('get-sync-path', () => {
    const cfg = readSyncConfig();
    return cfg ? { path: cfg.path, lastSync: cfg.lastSync || null } : null;
  });
  ipcMain.handle('set-sync-path', (_, { path }) => {
    writeSyncConfig({ path, deviceId: require('os').hostname(), lastSync: new Date().toISOString() });
    return { success: true };
  });
  ipcMain.handle('get-sync-info', ({ path: p }) => {
    try {
      const cloudSavePath = path.join(p, 'Idel-DreamMaker-Sync', 'save.json');
      if (!fs.existsSync(cloudSavePath)) return { hasCloudSave: false };
      const cloudData = JSON.parse(fs.readFileSync(cloudSavePath, 'utf-8'));
      const cloud = {
        playerName: cloudData.playerName || '?',
        hubTotalExp: cloudData.hubTotalExp || 0,
        totalExpEarned: cloudData.totalExpEarned || 0,
        lastWriteTimestamp: cloudData.lastWriteTimestamp || '',
        hubLevel: calcLevel(cloudData.hubTotalExp || 0),
      };
      const local = {
        playerName: gameState?.playerName || '?',
        hubTotalExp: gameState?.hubTotalExp || 0,
        totalExpEarned: gameState?.totalExpEarned || 0,
        lastWriteTimestamp: gameState?.lastWriteTimestamp || '',
        hubLevel: calcLevel(gameState?.hubTotalExp || 0),
      };
      return { hasCloudSave: true, cloud, local };
    } catch { return { hasCloudSave: false }; }
  });
  ipcMain.handle('select-sync-directory', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
  });
  ipcMain.handle('confirm-sync-directory', (_, { path, action }) => {
    try {
      writeSyncConfig({ path, deviceId: require('os').hostname(), lastSync: new Date().toISOString() });
      if (action === 'import') {
        const cloudSavePath = path.join(path, 'Idel-DreamMaker-Sync', 'save.json');
        if (fs.existsSync(cloudSavePath)) {
          const imported = JSON.parse(fs.readFileSync(cloudSavePath, 'utf-8'));
          Object.assign(gameState, imported);
          gameState._version = SAVE_VERSION;
          gameState.lastWriteTimestamp = new Date().toISOString();
          // Clear runtime fields that should not carry over
          gameState.pendingChoiceEvent = null;
          gameState._catchUpQueue = null;
          gameState._catchUpPaused = false;
          gameState._catchUpBlocked = false;
          // Rebuild scenario state
          hubLevel = calcLevel(gameState.hubTotalExp);
          if (gameState.scenarioId && !gameState.isInHub) {
            currentScenario = findScenarioById(gameState.scenarioId);
            if (currentScenario) currentTitle = getCurrentTitle(currentScenario, gameState.level);
          } else {
            currentScenario = null;
            currentTitle = null;
          }
          writeSave(gameState);
          return { success: true, imported: true };
        }
      }
      return { success: true, imported: false };
    } catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('sync-now', () => {
    try {
      const cfg = readSyncConfig();
      if (!cfg || !cfg.path) return { success: false, error: '未设置同步目录' };
      let imported = false;
      const cloudPath = path.join(cfg.path, 'Idel-DreamMaker-Sync', 'save.json');
      if (fs.existsSync(cloudPath)) {
        try {
          const cloudData = JSON.parse(fs.readFileSync(cloudPath, 'utf-8'));
          const localTime = gameState?.lastWriteTimestamp || '';
          const cloudTime = cloudData.lastWriteTimestamp || '';
          const localTotal = (gameState?.hubTotalExp || 0) + (gameState?.totalExpEarned || 0);
          const cloudTotal = (cloudData.hubTotalExp || 0) + (cloudData.totalExpEarned || 0);
          if (cloudTime > localTime && cloudTotal >= localTotal) {
            Object.assign(gameState, cloudData);
            gameState._version = SAVE_VERSION;
            gameState.lastWriteTimestamp = new Date().toISOString();
            gameState.pendingChoiceEvent = null;
            gameState._catchUpQueue = null;
            gameState._catchUpPaused = false;
            gameState._catchUpBlocked = false;
            hubLevel = calcLevel(gameState.hubTotalExp);
            if (gameState.scenarioId && !gameState.isInHub) {
              currentScenario = findScenarioById(gameState.scenarioId);
              if (currentScenario) currentTitle = getCurrentTitle(currentScenario, gameState.level);
            } else {
              currentScenario = null;
              currentTitle = null;
            }
            imported = true;
          }
        } catch (e) {}
      }
      writeSave(gameState);  // Push local to cloud
      // Notify pet window of new state
      try {
        const petState = {
          hubLevel: calcLevel(gameState.hubTotalExp),
          isInHub: gameState.isInHub,
          level: gameState.level,
        };
        forwardToPet('pet-state', petState);
      } catch {}
      return { success: true, imported };
    } catch (e) { return { success: false, error: e.message }; }
  });
  // ── Clear sync ──
  ipcMain.handle('clear-sync', () => {
    try {
      const cfg = readSyncConfig();
      if (cfg && cfg.path) {
        const cloudSave = path.join(cfg.path, 'Idel-DreamMaker-Sync', 'save.json');
        try { if (fs.existsSync(cloudSave)) fs.unlinkSync(cloudSave); } catch {}
      }
      const scp = getSyncConfigPath();
      try { if (fs.existsSync(scp)) fs.unlinkSync(scp); } catch {}
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });
  // ── Delete save ──
  ipcMain.handle('delete-save', () => {
    try {
      // Clear cloud save before cleaning local
      const scp = getSyncConfigPath();
      if (fs.existsSync(scp)) {
        try {
          const oldCfg = JSON.parse(fs.readFileSync(scp, 'utf-8'));
          if (oldCfg && oldCfg.path) {
            const cloudSave = path.join(oldCfg.path, 'Idel-DreamMaker-Sync', 'save.json');
            if (fs.existsSync(cloudSave)) fs.unlinkSync(cloudSave);
          }
        } catch {}
      }
      // Clear save
      const sp = path.join(getAppDataPath(), 'save.json');
      if (fs.existsSync(sp)) fs.unlinkSync(sp);
      // Clear logs
      const logDir = getLogDir();
      if (fs.existsSync(logDir)) fs.rmSync(logDir, { recursive: true, force: true });
      // Clear sync config
      if (fs.existsSync(scp)) fs.unlinkSync(scp);
      // Reset gameState to default
      const defaultScenario = allScenarios[0];
      gameState = {
        playerName: 'Worker',
        scenarioId: defaultScenario ? defaultScenario.id : '',
        level: 1, exp: 0, totalExpEarned: 0, totalRuntimeMs: 0,
        equippedTitleIndex: 0, isInHub: true, hubTotalExp: 0,
        language: 'zh', aiOutputLanguage: 'zh', selectedFontTheme: 'green',
        scenarioAlias: '', unlockedTitleSets: {}, scenarioProgress: {},
        triggeredEvents: [], unlockedAchievements: [],
        petSelectedIndex: 0, hasSeenOnboarding: false,
        lastLoginDay: '', hubEquippedTitles: {},
        dailyBonus: false, rebirthCounts: {}, rebirthExpBonus: 0,
        currentBranch: '', completedBranches: [], flags: {},
        gameCompletions: [], unlockedCompletionTitles: [], equippedCompletionTitle: null,
        archivedScenarios: [], promptDismissedAtScenarioCount: null,
        totalKeyPresses: 0, dailyKeyPresses: 0,
        keyPressDate: new Date().toISOString().slice(0, 10), comboMilestones: [], highestStreak: 0,
        choiceFlags: {}, pendingChoiceEvent: null, lastWriteTimestamp: new Date().toISOString(),
      };
      hubLevel = 1;
      currentScenario = null;
      currentTitle = null;
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // ── Check for update ──
  ipcMain.handle('check-for-update', () => {
    return new Promise((resolve) => {
      const req = https.get('https://api.github.com/repos/sandsand244263/idel-dream-maker/releases/latest', {
        headers: { 'User-Agent': 'idel-dream-maker', 'Accept': 'application/vnd.github.v3+json' },
        timeout: 8000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const r = JSON.parse(data);
            const latest = (r.tag_name || '').replace(/^v/, '');
            const current = APP_VERSION.replace(/^v/, '');
            const hasUpdate = latest !== current;
            resolve({
              success: true,
              hasUpdate,
              latestVersion: latest,
              currentVersion: APP_VERSION,
              downloadUrl: r.html_url || 'https://github.com/sandsand244263/idel-dream-maker/releases/latest',
            });
          } catch {
            resolve({ success: false, error: '解析响应失败' });
          }
        });
      });
      req.on('error', () => resolve({ success: false, error: '网络请求失败' }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: '请求超时' }); });
    });
  });
  let _bestMirror = null;

  ipcMain.handle('get-proxy-download', () => {
    return new Promise((resolve) => {
      if (_bestMirror) {
        resolve({ success: true, url: _bestMirror, name: '' });
        return;
      }
      const MIRRORS = [
        'https://gh-proxy.com',
        'https://ghproxy.homeboyc.cn',
        'https://moeyy.cn/gh-proxy',
      ];
      // Step 1: get download URL from GitHub API
      const req = https.get('https://api.github.com/repos/sandsand244263/idel-dream-maker/releases/latest', {
        headers: { 'User-Agent': 'idel-dream-maker', 'Accept': 'application/vnd.github.v3+json' },
        timeout: 8000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const r = JSON.parse(data);
            const assets = r.assets || [];
            const plat = process.platform;
            let asset = null;
            if (plat === 'win32') {
              asset = assets.find(a => a.name && a.name.includes('Setup') && a.name.endsWith('.exe'));
              if (!asset) asset = assets.find(a => a.name && a.name.endsWith('.exe'));
              if (!asset) asset = assets.find(a => a.name && a.name.includes('win'));
            } else if (plat === 'darwin') {
              asset = assets.find(a => a.name && a.name.includes('dmg'));
            } else {
              asset = assets.find(a => a.name && a.name.includes('tar.gz'));
            }
            if (!asset) {
              resolve({ success: false, error: '未找到匹配的安装包' });
              return;
            }
            const rawUrl = asset.browser_download_url;
            const name = asset.name;
            // Step 2: parallel HEAD check all mirrors
            let fastest = null;
            let fastestTime = Infinity;
            let completed = 0;
            const total = MIRRORS.length;
            for (const m of MIRRORS) {
              const mirrorUrl = m + '/' + rawUrl;
              const start = Date.now();
              const headReq = https.request(mirrorUrl, { method: 'HEAD', timeout: 3000 }, (headRes) => {
                const elapsed = Date.now() - start;
                if (headRes.statusCode < 400 && elapsed < fastestTime) {
                  fastestTime = elapsed;
                  fastest = mirrorUrl;
                }
                headReq.destroy();
                checkDone();
              });
              headReq.on('error', () => { checkDone(); });
              headReq.on('timeout', () => { headReq.destroy(); checkDone(); });
              headReq.end();
            }
            function checkDone() {
              completed++;
              if (completed < total) return;
              if (fastest) {
                _bestMirror = fastest;
                resolve({ success: true, url: fastest, name });
              } else {
                _bestMirror = rawUrl;
                resolve({ success: true, url: rawUrl, name });
              }
            }
          } catch {
            resolve({ success: false, error: '解析响应失败' });
          }
        });
      });
      req.on('error', () => resolve({ success: false, error: '网络请求失败' }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: '请求超时' }); });
    });
  });
  ipcMain.handle('open-update-url', (_, { url }) => {
    try { shell.openExternal(url); return { success: true }; } catch { return { success: false }; }
  });
  // ── Auto-update ──
  ipcMain.handle('trigger-update', () => {
    try { autoUpdater.quitAndInstall(); return { success: true }; } catch (e) { return { success: false, error: e.message }; }
  });
  // ── Auto-start ──
  ipcMain.handle('set-auto-start', (_, { enabled }) => {
    try { app.setLoginItemSettings({ openAtLogin: enabled }); return { success: true }; } catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('get-auto-start', () => {
    try { return { enabled: app.getLoginItemSettings().openAtLogin }; } catch { return { enabled: false }; }
  });
}

// ── App Lifecycle ──

app.whenReady().then(() => {
  // 单实例锁：防止多开互相覆盖存档
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) { app.quit(); return; }

  // 全局错误捕获
  const errorLogPath = path.join(getAppDataPath(), 'errors.log');
  function writeErrorLog(msg) {
    try {
      const dir = path.dirname(errorLogPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(errorLogPath, `[${new Date().toISOString()}] ${msg}\n`, 'utf-8');
    } catch {}
  }
  process.on('uncaughtException', (err) => {
    const msg = `[UNCAUGHT] ${err?.message || err}\n${err?.stack || ''}`;
    console.error(msg);
    writeErrorLog(msg);
    try { appendLogEntry('error', msg.slice(0, 500)); } catch {}
  });
  process.on('unhandledRejection', (reason) => {
    const msg = `[UNHANDLED] ${reason?.message || reason || 'unknown'}\n${reason?.stack || ''}`;
    console.error(msg);
    writeErrorLog(msg);
    try { appendLogEntry('error', msg.slice(0, 500)); } catch {}
  });
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  allScenarios = loadScenarios();
  const userScenarios = loadUserScenarios();
  if (userScenarios.length > 0) {
    allScenarios.push(...userScenarios);
    console.log(`Loaded ${userScenarios.length} user scenario(s)`);
  }

  // Load save or create default
  gameState = readSave();
  if (!gameState) {
    const defaultScenario = allScenarios[0];
    gameState = {
      playerName: 'Worker',
      scenarioId: defaultScenario ? defaultScenario.id : '',
      level: 1,
      exp: 0,
      totalExpEarned: 0,
      totalRuntimeMs: 0,
      equippedTitleIndex: 0,
      isInHub: true,
      hubTotalExp: 0,
      language: 'zh',
      aiOutputLanguage: 'zh',
      selectedFontTheme: 'green',
      scenarioAlias: '',
      unlockedTitleSets: {},
      scenarioProgress: {},
      triggeredEvents: [],
      unlockedAchievements: [],
      petSelectedIndex: 0,
      hasSeenOnboarding: false,
      lastLoginDay: '',
      hubEquippedTitles: {},
      dailyBonus: false,
      rebirthCounts: {},
      rebirthExpBonus: 0,
      currentBranch: '',
      completedBranches: [],
      flags: {},
      gameCompletions: [],
      unlockedCompletionTitles: [],
      equippedCompletionTitle: null,
      archivedScenarios: [],
      promptDismissedAtScenarioCount: null,
      totalKeyPresses: 0,
      dailyKeyPresses: 0,
      keyPressDate: new Date().toISOString().slice(0, 10),
      comboMilestones: [], highestStreak: 0,
      choiceFlags: {},
      pendingChoiceEvent: null,
      lastWriteTimestamp: new Date().toISOString(),
    };
  }

  // ── Old save migration (v3.3.1 → v3.4.0) ──
  if (gameState.rebirthCounts && Object.keys(gameState.rebirthCounts).length > 0) {
    const wastelandBranches = ['scavenger', 'merchant', 'soldier', 'ai'];
    const oldRebirths = gameState.rebirthCounts['wasteland'] || 0;
    if (oldRebirths > 0) {
      // Map old rebirths to completed branches
      if (!gameState.completedBranches) gameState.completedBranches = [];
      for (let i = 0; i < Math.min(oldRebirths, wastelandBranches.length); i++) {
        if (!gameState.completedBranches.includes(wastelandBranches[i])) {
          gameState.completedBranches.push(wastelandBranches[i]);
        }
      }
      // Award hub exp bonus for rebirths
      gameState.hubTotalExp = (gameState.hubTotalExp || 0) + gameState.totalExpEarned * 0.1 * oldRebirths;
      // Clean old data
      delete gameState.rebirthCounts['wasteland'];
      // Reset scenario to hub to avoid stale state
      gameState.scenarioId = '';
      gameState.isInHub = true;
      gameState.currentBranch = '';
      gameState.flags = gameState.flags || {};
      console.log(`[migration] Mapped ${oldRebirths} rebirths → ${gameState.completedBranches.length} branches, awarded hub EXP bonus`);
    }
  }
  // Ensure new fields exist
  if (!gameState.currentBranch) gameState.currentBranch = '';
  if (!gameState.completedBranches) gameState.completedBranches = [];
  if (!gameState.flags) gameState.flags = {};

  // Set current scenario
  if (gameState.scenarioId && !gameState.isInHub) {
    currentScenario = findScenarioById(gameState.scenarioId);
    if (currentScenario) {
      currentTitle = getCurrentTitle(currentScenario, gameState.level);
      setLogSession(gameState.scenarioId);
    }
  } else {
    currentScenario = null;
    currentTitle = null;
  }

  hubLevel = calcLevel(gameState.hubTotalExp);

  // Migrate old .json logs to .log format (one-time)
  const logDir = getLogDir();
  const migrateMarker = path.join(logDir, '.migrated');
  if (fs.existsSync(logDir) && !fs.existsSync(migrateMarker)) {
    const oldFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.json'));
    if (oldFiles.length > 0) {
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
      const legacyPath = path.join(logDir, `_legacy_${ts}.log`);
      for (const f of oldFiles) {
        try {
          const content = fs.readFileSync(path.join(logDir, f), 'utf-8').trim();
          if (!content) continue;
          if (content.startsWith('[')) {
            const entries = JSON.parse(content);
            for (const e of entries) {
              fs.appendFileSync(legacyPath, JSON.stringify({ t: e.t, ty: e.ty || 'event', m: e.m || '' }) + '\n', 'utf-8');
            }
          } else {
            for (const line of content.split('\n')) {
              try { JSON.parse(line); fs.appendFileSync(legacyPath, line + '\n', 'utf-8'); } catch {}
            }
          }
        } catch {}
      }
      for (const f of oldFiles) {
        try { fs.unlinkSync(path.join(logDir, f)); } catch {}
      }
    }
    try { fs.writeFileSync(migrateMarker, '', 'utf-8'); } catch {}
  }

  setupAppMenu();
  createWindow();

  // Restore window position from save
  if (gameState.windowX !== undefined && gameState.windowY !== undefined) {
    mainWindow.setPosition(gameState.windowX, gameState.windowY);
  }

  // Save window position on move
  let moveTimer = null;
  mainWindow.on('move', () => {
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      if (gameState && mainWindow) {
        const [x, y] = mainWindow.getPosition();
        gameState.windowX = x;
        gameState.windowY = y;
        writeSave(gameState);
      }
    }, 300);
  });

  setupTray();
  registerIpcHandlers();
  registerPetIpcHandlers(mainWindow, app);
  checkSyncOnStartup();
  setOnPetSelected((idx) => { if (gameState) gameState.petSelectedIndex = idx; });
  initPet(app, gameState?.petSelectedIndex);

  // Restore pending choice event if saved
  if (gameState.pendingChoiceEvent && mainWindow) {
    const pe = gameState.pendingChoiceEvent;
    const scenario = findScenarioById(pe.scenarioId);
    if (scenario) {
      try { mainWindow.webContents.send('choice-event', { title: pe.title, text: pe.text, choices: pe.choices, _eventId: pe.eventId }); } catch {}
      forwardToPet('choice-event', { title: pe.title, text: pe.text, choices: pe.choices, _eventId: pe.eventId });
    } else {
      gameState.pendingChoiceEvent = null;
      writeSave(gameState);
    }
  }

  // Trigger initial story for restored scenarios
  if (!gameState.isInHub && currentScenario) {
    const initEvent = findUnusedEvent('story', gameState.level);
    if (initEvent) {
      gameState.triggeredEvents.push(initEvent.id);
      const title = getCurrentTitle(currentScenario, gameState.level);
      if (initEvent.choice1 && initEvent.choice1Target) {
        const choices = buildChoices(initEvent);
        gameState.pendingChoiceEvent = {
          eventId: initEvent.id, scenarioId: gameState.scenarioId,
          title: '抉择', text: initEvent.text, choices,
        };
        const cp = { title: '抉择', text: initEvent.text, choices, _eventId: initEvent.id };
        try { mainWindow.webContents.send('choice-event', cp); } catch {}
        forwardToPet('choice-event', cp);
      }
      const luPayload = { level: gameState.level, title: title?.name || '', titleColor: title?.color || '#888', titleDesc: title?.desc || '', eventText: initEvent.choice1 ? null : initEvent.text };
      try { mainWindow.webContents.send('level-up', luPayload); } catch {}
      forwardToPet('level-up', luPayload);
    }
  }

  startGameLoop();
  initInputListener();
  setupAutoUpdater();
  autoUpdater.checkForUpdates().catch(() => {});

  // ── Clean up old installer files ──
  try {
    const updateDir = path.join(app.getPath('userData'), '__update__');
    if (fs.existsSync(updateDir)) {
      const files = fs.readdirSync(updateDir);
      for (const f of files) {
        if (f.endsWith('.exe') || f.endsWith('.dmg')) {
          fs.unlinkSync(path.join(updateDir, f));
        }
      }
      // Remove empty dir
      if (fs.readdirSync(updateDir).length === 0) fs.rmdirSync(updateDir);
    }
  } catch {}

  // Tooltip update every 5s
  tooltipInterval = setInterval(() => {
    if (!gameState || !tray) return;
    const rt = gameState.totalRuntimeMs;
    const s = Math.floor(rt / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const rtStr = `${h}h${m}m${sec}s`;
    const title = currentTitle ? currentTitle.name : '?';
    const lv = gameState.isInHub ? `大厅 Lv.${hubLevel}` : `Lv.${gameState.level}`;
    const sc = currentScenario ? (currentScenario.name_cn || currentScenario.nameCN || currentScenario.name) : (gameState.isInHub ? '大厅' : '?');
    setToolTip(`${gameState.playerName} | ${sc}\n${lv} | ${title} | ${rtStr}`);
  }, 5000);

  // Show main window after all setup is complete
  mainWindow._ignoreBlur = true;
  mainWindow.show();
  mainWindow.focus();
  setTimeout(() => { if (mainWindow) mainWindow._ignoreBlur = false; }, 500);
});

powerMonitor.on('shutdown', () => {
  if (gameState) writeSave(gameState, true);
});

app.on('before-quit', () => {
  isQuitting = true;
  stopGameLoop();
  if (tooltipInterval) clearInterval(tooltipInterval);
  try { uIOhook.stop(); } catch {}
  try { const { forwardToPet, getPetWindow } = require('./pet.cjs'); const pw = getPetWindow(); if (pw) pw._isQuitting = true; } catch {}
  if (gameState) {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      gameState.windowX = x;
      gameState.windowY = y;
    }
    writeSave(gameState);
  }
});

app.on('window-all-closed', () => {
  // Mac convention: don't quit when all windows are closed
  if (isMac) return;
  // Other platforms: keep running in tray
});
