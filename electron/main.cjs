const { app, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const { createMainWindow, getMainWindow } = require('./windows.cjs');
const { createTray, setToolTip, getTray, updateMenu } = require('./tray.cjs');
const { registerPetIpcHandlers, forwardToPet, initPet, broadcastTheme, setOnPetSelected } = require('./pet.cjs');
const { getTodaysHolidayId, getUpcomingHolidayId, getHolidayName, getHolidayIcon, getHolidayEventFromScenario, getRandomHolidayEvent } = require('./holiday.cjs');
const { parseScenarioMd } = require('../src/scenario-parser.cjs');
const { GlobalKeyboardListener } = require('node-global-key-listener');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const isMac = process.platform === 'darwin';
const SAVE_VERSION = 2;

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
  const maxR = scenario.max_rebirth || 0;
  if (maxR === 0) return true;
  const currentR = (gameState.rebirthCounts || {})[scenarioId] || 0;
  return currentR >= maxR;
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

function appendLogEntry(type, msg) {
  try {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const filePath = path.join(getLogDir(), dateKey + '.json');
    let entries = [];
    if (fs.existsSync(filePath)) {
      entries = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    entries.push({
      t: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`,
      ty: type,
      m: msg,
    });
    fs.writeFileSync(filePath, JSON.stringify(entries), 'utf-8');
  } catch (e) { console.error('appendLogEntry error:', e); }
}

function getLogDates() {
  try {
    const dir = getLogDir();
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    return files.map(f => f.replace('.json', '')).sort();
  } catch { return []; }
}

function getLogEntries(date) {
  try {
    const filePath = path.join(getLogDir(), date + '.json');
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { return []; }
}

// ── IPC Handlers ──

function readSave() {
  try {
    const sp = path.join(getAppDataPath(), 'save.json');
    if (!fs.existsSync(sp)) return null;
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

function writeSave(data) {
  try {
    data._version = SAVE_VERSION;
    const dir = getAppDataPath();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'save.json'), JSON.stringify(data, null, 2), 'utf-8');
    // Dual write to sync dir if configured
    const syncCfg = readSyncConfig();
    if (syncCfg && syncCfg.path) {
      try {
        const syncDir = syncCfg.path;
        if (fs.existsSync(syncDir)) {
          fs.writeFileSync(path.join(syncDir, 'save.json'), JSON.stringify(data, null, 2), 'utf-8');
        }
      } catch {}
    }
  } catch (e) { console.error('Save failed:', e); }
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
let keyListener = null;
const KEY_STREAK_WINDOW = 3000;
const KEY_REPEAT_MS = 40;
let keyStream = [];
let lastKeyTime = {};
let comboMilestones = [];

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

function initKeyListener() {
  try {
    keyListener = new GlobalKeyboardListener();
    keyListener.addListener((e, release) => {
      if (e.state !== 'DOWN') return;
      const vk = e.vKey;
      if (vk <= 7) return;
      if (vk === 16 || vk === 17 || vk === 18 || vk === 20) return;
      if (vk === 27) return;
      if (vk >= 91 && vk <= 93) return;
      if (vk >= 112 && vk <= 135) return;
      if (vk === 144 || vk === 145) return;

      if (!gameState) return;
      const now = Date.now();
      // Filter auto-repeat (long press)
      if (lastKeyTime[vk] && now - lastKeyTime[vk] < KEY_REPEAT_MS) return;
      lastKeyTime[vk] = now;
      gameState.totalKeyPresses = (gameState.totalKeyPresses || 0) + 1;
      gameState.dailyKeyPresses = (gameState.dailyKeyPresses || 0) + 1;

      keyStream.push(now);
      keyStream = keyStream.filter(t => now - t <= KEY_STREAK_WINDOW);
      const streak = keyStream.length;
      const grade = getGrade(streak);

      // Milestone check: first time reaching this grade
      if (grade && !gameState.comboMilestones) gameState.comboMilestones = [];
      if (grade && !gameState.comboMilestones.includes(grade)) {
        gameState.comboMilestones = [...gameState.comboMilestones, grade];
      }

      try { forwardToPet('key-combo', { streak, grade, total: gameState.totalKeyPresses, daily: gameState.dailyKeyPresses }); } catch {}
    });
  } catch (e) {
    console.error('Failed to init key listener:', e);
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
  if (exp <= 980100) return Math.floor(Math.sqrt(exp / 100)) + 1;  // LV1-100 原公式
  return 100 + Math.floor((exp - 980100) / 6000);                   // LV100+ 线性加速
}

function calcExpForLevel(level) {
  if (level <= 1) return 0;
  if (level <= 100) return 100 * (level - 1) * (level - 1);
  return 980100 + (level - 100) * 6000;   // LV100+ 线性段反推
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
    const luPayload = { level: gameState.level, title: title?.name || '', titleColor: title?.color || '#888', titleDesc: title?.desc || '', eventText: initEvent.text };
    try { mainWindow.webContents.send('level-up', luPayload); } catch {}
    forwardToPet('level-up', luPayload);
  }
}

function exitToHub() {
  // Clear pending choice on exit
  if (gameState) gameState.pendingChoiceEvent = null;
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

function findUnusedEvent(type, level) {
  if (!currentScenario || !currentScenario.events || gameState.isInHub) return null;
  const currentRebirth = (gameState.rebirthCounts && gameState.rebirthCounts[gameState.scenarioId]) || 0;
  const pool = currentScenario.events.filter(e => {
    if (e.type && e.type !== type) return false;
    if (e.minLevel && e.minLevel > level) return false;
    if (e.minRebirth && e.minRebirth > currentRebirth) return false;
    if (e.once && gameState.triggeredEvents.includes(e.id)) return false;
    return true;
  });
  if (pool.length === 0) return null;
  return pool[0];
}

function checkAndTriggerEvent(typeFilter) {
  if (!currentScenario || !currentScenario.events || gameState.isInHub) return;

  const runtimeHours = gameState.totalRuntimeMs / 3600000;
  let prob;
  if (runtimeHours < 12) prob = 0.4;
  else if (runtimeHours < 72) prob = 0.3;
  else prob = 0.15;

  if (Math.random() < prob) {
    // Check holiday: 当天 first, then 临近
    const todayHoliday = getTodaysHolidayId();
    const upcomingHoliday = !todayHoliday ? getUpcomingHolidayId() : null;
    const holidayInfo = todayHoliday || upcomingHoliday;

    if (holidayInfo) {
      const holidayKey = 'holiday_' + holidayInfo.id + '_' + holidayInfo.type;
      // Skip if already triggered, fall through to normal events
      if (!gameState.triggeredEvents.includes(holidayKey)) {
        const he = getHolidayEventFromScenario(currentScenario, holidayInfo.id, holidayInfo.type);
        if (he) {
          gameState.triggeredEvents.push(holidayKey);
          return {
            id: holidayKey,
            title: he.holidayName,
            color: '#FFD700',
            text: he.text,
            isHoliday: true,
          };
        }
      }
    }

    const pool = currentScenario.events.filter(e => {
      if (typeFilter && e.type && e.type !== typeFilter) return false;
      if (e.minLevel && e.minLevel > gameState.level) return false;
      if (e.minHours && e.minHours > runtimeHours) return false;
      if (e.minRebirth && e.minRebirth > ((gameState.rebirthCounts && gameState.rebirthCounts[gameState.scenarioId]) || 0)) return false;
      // Filler: only trigger events exactly matching current rebirth (not lower rebirth's filler)
      if (e.type === 'filler' && e.minRebirth !== ((gameState.rebirthCounts && gameState.rebirthCounts[gameState.scenarioId]) || 0)) return false;
      if (e.once && gameState.triggeredEvents.includes(e.id)) return false;
      return true;
    });
    // Filler daily cap: dynamic — 8 + floor(挂机小时/4) + 每日仪式 2 + 重生加成
    const fillerCap = 8 + Math.floor(runtimeHours / 4) + (gameState.dailyBonus ? 2 : 0) + (gameState.fillerRebirthBonus || 0);
    if (typeFilter === 'filler' && (gameState.fillerCountToday || 0) >= fillerCap) return null;

    if (pool.length > 0) {
      const totalWeight = pool.reduce((sum, e) => sum + (e.weight || 1), 0);
      let r = Math.random() * totalWeight;
      for (const e of pool) {
        r -= (e.weight || 1);
        if (r <= 0) {
          gameState.triggeredEvents.push(e.id);
          return e;
        }
      }
    }
  }
  return null;
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

  const currentRebirth = (gameState.rebirthCounts && gameState.rebirthCounts[gameState.scenarioId]) || 0;
  const unlocked = [];
  for (const a of currentScenario.achievements) {
    if (gameState.unlockedAchievements.includes(a.id)) continue;
    if (a.minRebirth !== undefined && a.minRebirth !== currentRebirth) continue;
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
    const maxR = s.max_rebirth || 0;
    if (maxR === 0) return true;
    const currentR = (gameState.rebirthCounts || {})[s.id] || 0;
    return currentR >= maxR;
  });
}

let hubIdleMs = 0;
let lastHubReminderMs = 0;

function startGameLoop() {
  if (gameLoopInterval) return;
  let lastTick = Date.now();
  hubIdleMs = 0;
  lastHubReminderMs = 0;

  const HUB_REMINDERS = [
    '在大厅挂机不涨经验，进副本才有。',
    '已经在大厅待了5分钟，不选个副本开始吗？',
    '大厅只能管理和浏览，经验在副本里。',
    '副本才是挂机的地方——选一个进去吧。',
    '在大厅不会有事件触发，副本里才有故事。',
  ];

  gameLoopInterval = setInterval(() => {
    if (!gameState) return;

    resetDailyIfNewDay();

    const now = Date.now();
    const delta = now - lastTick;
    lastTick = now;

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
      rebirth_count: (gameState.rebirthCounts && gameState.rebirthCounts[gameState.scenarioId]) || 0,
      mechanic: currentScenario ? (currentScenario.mechanic || 'standard') : 'standard',
      hub_title: gameState?.equippedCompletionTitle?.title || getHubTitle(hubLevel).name,
      total_key_presses: gameState.totalKeyPresses || 0,
      daily_key_presses: gameState.dailyKeyPresses || 0,
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
    const expGain = (delta / 1000) * expMultiplier * (1 + (gameState.rebirthExpBonus || 0));
    gameState.exp += expGain;
    gameState.totalExpEarned += expGain;

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
        const choices = [];
        if (storyEvent.choice1Target) choices.push({ text: storyEvent.choice1, target: storyEvent.choice1Target });
        if (storyEvent.choice2Target) choices.push({ text: storyEvent.choice2, target: storyEvent.choice2Target });
        gameState.pendingChoiceEvent = {
          eventId: storyEvent.id,
          scenarioId: gameState.scenarioId,
          title: '抉择',
          text: storyEvent.text,
          choices,
        };
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
      const storyEvents = currentScenario.events.filter(e => e.type === 'story');
      const endingEvent = storyEvents[storyEvents.length - 1];
      const endingPayload = {
        scenarioId: gameState.scenarioId,
        scenarioName: currentScenario.name_cn || currentScenario.nameCN || currentScenario.name,
        text: endingEvent ? endingEvent.text : '你的旅程已达终点。',
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
        gameState.gameCompletions.push({ scenarioId: gameState.scenarioId, date: new Date().toISOString().slice(0,10), rebirthCount: (gameState.rebirthCounts && gameState.rebirthCounts[gameState.scenarioId]) || 0 });
      }
      // 首次通关解锁通关称号（来自 .md completion_title）
      if (currentScenario.completion_title) {
        if (!gameState.unlockedCompletionTitles) gameState.unlockedCompletionTitles = [];
        const alreadyUnlocked = gameState.unlockedCompletionTitles.find(c => c.scenarioId === gameState.scenarioId);
        if (!alreadyUnlocked) {
          gameState.unlockedCompletionTitles.push({
            scenarioId: gameState.scenarioId,
            scenarioName: currentScenario.name_cn || currentScenario.nameCN || currentScenario.name,
            title: currentScenario.completion_title,
          });
        }
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

    // Event check — filler only (every ~60s)
    if (Math.random() < delta / 60000) {
      const event = checkAndTriggerEvent('filler');
      if (event) {
        gameState.fillerCountToday = (gameState.fillerCountToday || 0) + 1;
        const evPayload = { id: event.id, title: event.title || '事件', color: event.color || '#FFA500', text: event.text };
        try { mainWindow.webContents.send('event-triggered', evPayload); } catch {}
        forwardToPet('event-triggered', evPayload);
      }
    }

    // Daily login ritual (once per day)
    if (!gameState.isInHub && currentScenario) {
      const today = new Date().toISOString().slice(0, 10);
      if (gameState.lastLoginDay !== today) {
        gameState.lastLoginDay = today;
        gameState.fillerCountToday = 0;
        gameState.dailyBonus = true;
        const ritualPayload = {
          id: 'daily_ritual_' + today,
          title: '新的一日',
          color: '#FFD700',
          text: '新的一天开始了。你抖落身上的尘土，准备继续你的旅程。',
        };
        try { mainWindow.webContents.send('event-triggered', ritualPayload); } catch {}
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
      writeSave(gameState);
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
    appendLogEntry(type, msg);
    return true;
  });

  ipcMain.handle('get-log-dates', () => {
    return getLogDates();
  });

  ipcMain.handle('get-log-entries', (_, { date }) => {
    return getLogEntries(date);
  });

  // ── Rebirth ──
  ipcMain.handle('rebirth-scenario', (_, { scenarioId }) => {
    const sid = scenarioId || gameState.scenarioId;
    if (!sid) return { success: false, error: '无副本ID' };
    // 检查重生上限
    const scenario = findScenarioById(sid);
    const maxR = scenario?.max_rebirth ?? 0;
    const currentR = gameState.rebirthCounts?.[sid] || 0;
    if (maxR > 0 && currentR >= maxR) {
      return { success: false, error: '已达到该副本重生上限' };
    }
    // 增加重生次数
    if (!gameState.rebirthCounts) gameState.rebirthCounts = {};
    gameState.rebirthCounts[sid] = (gameState.rebirthCounts[sid] || 0) + 1;
    // 计算总重生次数（所有副本）
    const totalRebirths = Object.values(gameState.rebirthCounts).reduce((a, b) => a + b, 0);
    // 经验加成：每次 +10%，封顶 +50%
    gameState.rebirthExpBonus = Math.min(0.5, totalRebirths * 0.1);
    // filler 上限加成：每次 +5，封顶 +25
    gameState.fillerRebirthBonus = Math.min(25, totalRebirths * 5);
    // 清空该副本进度
    if (gameState.scenarioProgress) delete gameState.scenarioProgress[sid];
    // 清空通关记录中该副本的（保留成就）
    if (gameState.gameCompletions) {
      gameState.gameCompletions = gameState.gameCompletions.filter(c => c.scenarioId !== sid);
    }
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
      const desktop = path.join(require('os').homedir(), 'Desktop');
      const exportDir = path.join(desktop, `Idel-DreamMaker-日志-${new Date().toISOString().slice(0,10)}`);
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
      // Copy log files
      const logDir = getLogDir();
      if (fs.existsSync(logDir)) {
        fs.readdirSync(logDir).forEach(f => {
          const src = path.join(logDir, f);
          if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(exportDir, f));
        });
      }
      // Copy save file
      const savePath = path.join(getAppDataPath(), 'save.json');
      if (fs.existsSync(savePath)) fs.copyFileSync(savePath, path.join(exportDir, 'save.json'));
      // Write version info
      const verInfo = [
        `Idel-DreamMaker v${APP_VERSION}`,
        `导出时间: ${new Date().toLocaleString('zh-CN')}`,
        `系统: ${process.platform} ${process.arch}`,
        `Node: ${process.version}`,
        `Electron: ${process.versions.electron}`,
        `存档路径: ${getAppDataPath()}`,
        `副本数: ${allScenarios.length}`,
        `已通关: ${(gameState.gameCompletions || []).filter((c,i,a) => a.findIndex(x=>x.scenarioId===c.scenarioId)===i).length}`,
        `大厅等级: ${hubLevel}`,
      ].join('\n');
      fs.writeFileSync(path.join(exportDir, '版本信息.txt'), verInfo, 'utf-8');
      return { success: true, path: exportDir };
    } catch (e) {
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

  // ── Key stats ──
  // ── Choice events ──
  ipcMain.handle('choice-selected', (_, { eventId, choiceIndex }) => {
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
        const evPayload = { id: targetEvent.id, title: '事件', color: '#00BFFF', text: targetEvent.text };
        try { mainWindow.webContents.send('event-triggered', evPayload); } catch {}
        forwardToPet('event-triggered', evPayload);
      }
    }
    gameState.pendingChoiceEvent = null;
    writeSave(gameState);
    return { success: true, choiceFlag: gameState.choiceFlags[pe.scenarioId]?.[pe.eventId] };
  });

  ipcMain.handle('get-key-stats', () => {
    if (!gameState) return { total: 0, daily: 0, milestones: [] };
    const grade = getGrade(keyStream.length);
    return {
      total: gameState.totalKeyPresses || 0,
      daily: gameState.dailyKeyPresses || 0,
      streak: keyStream.length,
      grade,
      milestones: gameState.comboMilestones || [],
    };
  });

  // ── Sync ──
  ipcMain.handle('get-sync-path', () => {
    const cfg = readSyncConfig();
    return cfg ? { path: cfg.path } : null;
  });
  ipcMain.handle('set-sync-path', (_, { path }) => {
    writeSyncConfig({ path, deviceId: require('os').hostname(), lastSync: new Date().toISOString() });
    return { success: true };
  });
  ipcMain.handle('select-sync-directory', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!result.canceled && result.filePaths.length > 0) {
      writeSyncConfig({ path: result.filePaths[0], deviceId: require('os').hostname(), lastSync: new Date().toISOString() });
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
  });
  ipcMain.handle('sync-now', () => {
    try {
      const cfg = readSyncConfig();
      if (!cfg || !cfg.path) return { success: false, error: '未设置同步目录' };
      if (gameState) writeSave(gameState);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });
  // ── Delete save ──
  ipcMain.handle('delete-save', () => {
    try {
      // Clear save
      const sp = path.join(getAppDataPath(), 'save.json');
      if (fs.existsSync(sp)) fs.unlinkSync(sp);
      // Clear logs
      const logDir = getLogDir();
      if (fs.existsSync(logDir)) fs.rmSync(logDir, { recursive: true, force: true });
      // Clear sync config
      const scp = getSyncConfigPath();
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
        lastLoginDay: '', fillerCountToday: 0, hubEquippedTitles: {},
        dailyBonus: false, rebirthCounts: {}, rebirthExpBonus: 0, fillerRebirthBonus: 0,
        gameCompletions: [], unlockedCompletionTitles: [], equippedCompletionTitle: null,
        archivedScenarios: [], promptDismissedAtScenarioCount: null,
        totalKeyPresses: 0, dailyKeyPresses: 0,
        keyPressDate: new Date().toISOString().slice(0, 10), comboMilestones: [],
        choiceFlags: {}, pendingChoiceEvent: null,
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
  ipcMain.handle('open-update-url', (_, { url }) => {
    try { shell.openExternal(url); return { success: true }; } catch { return { success: false }; }
  });
}

// ── App Lifecycle ──

app.whenReady().then(() => {
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
      fillerCountToday: 0,
      hubEquippedTitles: {},
      dailyBonus: false,
      rebirthCounts: {},
      rebirthExpBonus: 0,
      fillerRebirthBonus: 0,
      gameCompletions: [],
      unlockedCompletionTitles: [],
      equippedCompletionTitle: null,
      archivedScenarios: [],
      promptDismissedAtScenarioCount: null,
      totalKeyPresses: 0,
      dailyKeyPresses: 0,
      keyPressDate: new Date().toISOString().slice(0, 10),
      comboMilestones: [],
      choiceFlags: {},
      pendingChoiceEvent: null,
    };
  }

  // Set current scenario
  if (gameState.scenarioId && !gameState.isInHub) {
    currentScenario = findScenarioById(gameState.scenarioId);
    if (currentScenario) {
      currentTitle = getCurrentTitle(currentScenario, gameState.level);
    }
  } else {
    currentScenario = null;
    currentTitle = null;
  }

  hubLevel = calcLevel(gameState.hubTotalExp);

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
      }
    }, 300);
  });

  setupTray();
  registerIpcHandlers();
  registerPetIpcHandlers(mainWindow, app);
  setOnPetSelected((idx) => { if (gameState) gameState.petSelectedIndex = idx; });
  initPet(app, gameState?.petSelectedIndex);

  // Restore pending choice event if saved
  if (gameState.pendingChoiceEvent && mainWindow) {
    const pe = gameState.pendingChoiceEvent;
    try { mainWindow.webContents.send('choice-event', { title: pe.title, text: pe.text, choices: pe.choices }); } catch {}
    forwardToPet('choice-event', { title: pe.title, text: pe.text, choices: pe.choices });
  }

  // Trigger initial story for restored scenarios
  if (!gameState.isInHub && currentScenario) {
    const initEvent = findUnusedEvent('story', gameState.level);
    if (initEvent) {
      gameState.triggeredEvents.push(initEvent.id);
      const title = getCurrentTitle(currentScenario, gameState.level);
      const luPayload = { level: gameState.level, title: title?.name || '', titleColor: title?.color || '#888', titleDesc: title?.desc || '', eventText: initEvent.text };
      try { mainWindow.webContents.send('level-up', luPayload); } catch {}
      forwardToPet('level-up', luPayload);
    }
  }

  startGameLoop();
  initKeyListener();

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

app.on('before-quit', () => {
  isQuitting = true;
  stopGameLoop();
  if (tooltipInterval) clearInterval(tooltipInterval);
  if (keyListener) try { keyListener.kill(); } catch {}
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
