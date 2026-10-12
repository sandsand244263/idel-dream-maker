const { app, ipcMain, Menu, dialog, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const { createMainWindow, getMainWindow } = require('./windows.cjs');
const { createTray, setToolTip, getTray, updateMenu } = require('./tray.cjs');
const { registerPetIpcHandlers, forwardToPet, initPet, broadcastTheme, setOnPetSelected, showPetWindow, getPetWindow } = require('./pet.cjs');
const { getTodaysHolidayId, getUpcomingHolidayId, getHolidayName, getHolidayIcon, getHolidayEventFromScenario, getRandomHolidayEvent } = require('./holiday.cjs');
const { parseScenarioMd } = require('../src/scenario-parser.cjs');
const { calcLevel, calcExpForLevel } = require('../level-curve.cjs');
const PET_LINES = require('./pet-lines.cjs');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

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
  { id: 'hub_lv50', name: '初出茅庐', desc: '宠物等级达到 50', condition: { type: 'pet_level', value: 50 } },
  { id: 'hub_lv100', name: '百级之路', desc: '宠物等级达到 100', condition: { type: 'pet_level', value: 100 } },
  { id: 'hub_lv200', name: '两百之巅', desc: '宠物等级达到 200', condition: { type: 'pet_level', value: 200 } },
  { id: 'hub_lv300', name: '三百之峰', desc: '宠物等级达到 300', condition: { type: 'pet_level', value: 300 } },
  { id: 'hub_complete3', name: '集邮者', desc: '通关 3 个不同世界', condition: { type: 'completions', value: 3 } },
  { id: 'hub_half', name: '半数圆满', desc: '通关当前一半世界', condition: { type: 'completions_half', value: 0 } },
  { id: 'hub_all', name: '大圆满', desc: '通关所有世界', condition: { type: 'completions_all', value: 0 } },
  { id: 'hub_complete5', name: '万界旅人', desc: '通关 5 个不同世界', condition: { type: 'completions', value: 5 } },
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
  const petLevel = calcLevel(gameState.petTotalExp);
  for (const a of HUB_ACHIEVEMENTS) {
    if (gameState.unlockedAchievements.includes(a.id)) continue;
    let met = false;
    switch (a.condition.type) {
      case 'pet_level': met = petLevel >= a.condition.value; break;
      case 'completions': met = completionCount >= a.condition.value; break;
      case 'completions_half': met = totalScenarios > 0 && completionCount >= Math.ceil(totalScenarios / 2); break;
      case 'completions_all': met = totalScenarios > 0 && completionCount >= totalScenarios; break;
    }
    if (met) {
      gameState.unlockedAchievements.push(a.id);
      unlocked.push(a);
    }
  }
  return unlocked;
}

// ── v4 阶梯成就（tier 动态档位，设计文档 §8.2）──
// 档位公式：add = floor(值/step)（无限延伸）；typing 为 mul = 每档 ×10（1万/10万/100万…）
const TIER_DEFS = [
  { key: 'level',   name: '百级之路', desc: '宠物等级', mode: 'add', step: 100,  metric: () => calcLevel(gameState.petTotalExp) },
  { key: 'time',    name: '百日陪伴', desc: '陪伴时长', mode: 'add', step: 100,  metric: () => Math.floor((gameState.totalRuntimeMs || 0) / 3600000) },
  { key: 'typing',  name: '键盘大师', desc: '累计打字', mode: 'mul', base: 10000, metric: () => gameState.totalKeyPresses || 0 },
  { key: 'stories', name: '故事成册', desc: '阅读段数', mode: 'add', step: 500,  metric: () => gameState.petStoriesRead || 0 },
  { key: 'worlds',  name: '万界旅人', desc: '通关世界', mode: 'add', step: 3,    metric: () => (gameState.gameCompletions || []).filter((c, i, arr) => arr.findIndex(x => x.scenarioId === c.scenarioId) === i).length },
  { key: 'hidden',  name: '探秘者',   desc: '隐藏内容', mode: 'add', step: 3,    metric: () => gameState.petHiddenRead || 0 },
];

// 档位序号：前 10 档罗马数字（字母组合），超过切阿拉伯数字
function tierOrdinal(n) {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return n <= 10 ? roman[n - 1] : String(n);
}

function tierCountFor(def) {
  const cur = def.metric();
  if (def.mode === 'mul') return cur < def.base ? 0 : Math.floor(Math.log10(cur / def.base)) + 1;
  return Math.floor(cur / def.step);
}

// 检查阶梯档位：返回新解锁档位数组（多档合并由调用方通知）
function checkTierAchievements() {
  if (!gameState) return [];
  if (!gameState.tierAchievements) gameState.tierAchievements = { level: 0, time: 0, typing: 0, stories: 0, worlds: 0, hidden: 0 };
  const newly = [];
  for (const def of TIER_DEFS) {
    const tiers = tierCountFor(def);
    const unlocked = gameState.tierAchievements[def.key] || 0;
    if (tiers > unlocked) {
      for (let i = unlocked + 1; i <= tiers; i++) {
        newly.push({ id: `tier_${def.key}_${i}`, name: `${def.name} ${tierOrdinal(i)}`, desc: `${def.desc} · 第 ${i} 档`, icon: '★' });
      }
      gameState.tierAchievements[def.key] = tiers;
    }
  }
  return newly;
}

// ── v4 里程碑成就（少量固定，设计文档 §8.3）──
function checkMilestoneAchievements() {
  if (!gameState) return [];
  const newly = [];
  const defs = [
    { id: 'm_first_green',     name: '状态全满', desc: '首次三维全绿', met: () => (gameState.petFullness || 0) >= 60 && (gameState.petMood || 0) >= 60 && (gameState.petCleanliness || 0) >= 60 },
    { id: 'm_first_choice',    name: '选择时刻', desc: '做出首次抉择', met: () => Object.keys(gameState.choiceFlags || {}).length > 0 },
    { id: 'm_first_completion', name: '初次通关', desc: '首次通关一个世界', met: () => (gameState.gameCompletions || []).length > 0 },
    { id: 'm_first_title',     name: '初戴桂冠', desc: '获得首个称号', met: () => Object.keys(gameState.unlockedTitleSets || {}).length > 0 || (gameState.unlockedCompletionTitles || []).length > 0 },
    { id: 'm_first_hidden',    name: '初探秘辛', desc: '首次发现隐藏内容', met: () => (gameState.petHiddenRead || 0) > 0 },
  ];
  for (const d of defs) {
    if (!gameState.unlockedAchievements.includes(d.id) && d.met()) {
      gameState.unlockedAchievements.push(d.id);
      newly.push({ id: d.id, name: d.name, desc: d.desc, icon: '★' });
    }
  }
  return newly;
}

function canArchiveScenario(scenarioId) {
  if (!gameState) return false;
  const scenario = findScenarioById(scenarioId);
  if (!scenario) return false;
  const hasCompleted = (gameState.gameCompletions || []).some(c => c.scenarioId === scenarioId);
  if (!hasCompleted) return false;
  const branches = scenario.branches || [];
  if (branches.length === 0) return true;
  const bp = (gameState.branchProgress && gameState.branchProgress[scenarioId]) || [];
  return branches.every(b => bp.includes(b));
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

  if (app.isPackaged || process.env.SCREENSHOT_MODE) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:1420');
  }

  mainWindow._isQuitting = false;
  mainWindow.on('show', () => {  });
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

const IS_DEV = process.argv.includes('--dev');

function getSaveFileName() {
  return IS_DEV ? 'save_dev.json' : 'save.json';
}

// 本地日期 YYYY-MM-DD（避免 UTC 偏移导致早 8 点前跨天）
function getLocalDateStr(d) {
  const date = d || new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 导入的存档补缺省字段 + 清理运行时字段（防 .includes()/.push() TypeError 与状态串扰）
function normalizeGameState(gs) {
  if (!gs || typeof gs !== 'object') return;
  if (!Array.isArray(gs.triggeredEvents)) gs.triggeredEvents = [];
  if (!Array.isArray(gs.unlockedAchievements)) gs.unlockedAchievements = [];
  if (!gs.flags || typeof gs.flags !== 'object') gs.flags = {};
  if (!gs.scenarioProgress || typeof gs.scenarioProgress !== 'object') gs.scenarioProgress = {};
  if (!Array.isArray(gs.gameCompletions)) gs.gameCompletions = [];
  if (!gs.rebirthCounts || typeof gs.rebirthCounts !== 'object') gs.rebirthCounts = {};
  if (!gs.branchProgress || typeof gs.branchProgress !== 'object') gs.branchProgress = {};
  if (!gs.unlockedTitleSets || typeof gs.unlockedTitleSets !== 'object') gs.unlockedTitleSets = {};
  if (gs.currentBranch === undefined) gs.currentBranch = '';
  if (typeof gs.level !== 'number' || gs.level < 1) gs.level = 1;
  if (typeof gs.exp !== 'number') gs.exp = 0;
  if (typeof gs.totalExpEarned !== 'number') gs.totalExpEarned = 0;
  if (typeof gs.totalRuntimeMs !== 'number') gs.totalRuntimeMs = 0;
  if (typeof gs.hubTotalExp !== 'number') gs.hubTotalExp = 0;
  // v4 等级单轨化：petTotalExp = 两池合并（迁移），此后唯一经验池
  if (typeof gs.petTotalExp !== 'number') gs.petTotalExp = (gs.hubTotalExp || 0) + (gs.totalExpEarned || 0);
  // v4 饲养三维（上限 100，默认 80）+ 双道具（食物/肥皂，上限 50）
  if (typeof gs.petFullness !== 'number') gs.petFullness = 80;
  if (typeof gs.petMood !== 'number') gs.petMood = 80;
  if (typeof gs.petCleanliness !== 'number') gs.petCleanliness = 80;
  if (typeof gs.petFoods !== 'number') gs.petFoods = 0;
  if (typeof gs.petSoaps !== 'number') gs.petSoaps = 0;
  if (typeof gs.petFoodAccum !== 'number') gs.petFoodAccum = 0;
  if (typeof gs.petSoapAccum !== 'number') gs.petSoapAccum = 0;
  if (typeof gs.petStateUpdatedAt !== 'number') gs.petStateUpdatedAt = Date.now();
  // v4 成就阶梯：已解锁档数 + 全局阅读统计
  if (!gs.tierAchievements || typeof gs.tierAchievements !== 'object') gs.tierAchievements = { level: 0, time: 0, typing: 0, stories: 0, worlds: 0, hidden: 0 };
  if (typeof gs.petStoriesRead !== 'number') gs.petStoriesRead = 0;
  if (typeof gs.petHiddenRead !== 'number') gs.petHiddenRead = 0;
  // v4.1 事件成就的高水位：事件类成就按"触发过 N 个不同事件"判定，而 triggeredEvents
  // 同时也是"已读"记录（重访从头重温/跨分支清理会清它）。用高水位兜底，兑现设计文档
  // §8.1"已解锁永不收回"——计数只增不减。
  if (typeof gs.petEventsPeak !== 'number') gs.petEventsPeak = (gs.triggeredEvents?.length || 0);
  // v4.1：本世界是否已读到结局（读到就收尾，不再往下推多个结局）
  if (typeof gs._storyEnded !== 'boolean') gs._storyEnded = false;
  // v4 宠物性别：male / female / null=中性（只用通用池）
  if (gs.petGender !== 'male' && gs.petGender !== 'female') gs.petGender = null;
  // v4 宠物称谓：null=默认"主人"，设置后替换台词中的"主人"占位
  if (typeof gs.petCallName !== 'string' || gs.petCallName.length > 8) gs.petCallName = '';
  // v4 更新说明弹窗标记
  if (typeof gs.lastSeenChangelogVersion !== 'string') gs.lastSeenChangelogVersion = '';
  // 离线衰减结算：按真实时间差衰减（几天不开回来发现饿了；见底无惩罚）
  const petIdleMs = Date.now() - gs.petStateUpdatedAt;
  if (petIdleMs > 5000) applyPetDecay(gs, petIdleMs);
  gs.petStateUpdatedAt = Date.now();
  gs.pendingChoiceEvent = null;
  gs._catchUpQueue = null;  gs._lastCatchUpTime = 0;
  gs._lastCyberBlock = undefined;
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

function setLogSession(sessionId) {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
  _currentLogFile = path.join(getLogDir(), `${sessionId}_${ts}.log`);
}

function clearLogSession() {
  _currentLogFile = null;
}

// v4.1：日志保留上限——每个副本只保留最近 N 个会话日志（文件名带时间戳，字典序即时间序），
// 避免日志目录随游玩次数无限增长。启动时执行一次。
const LOG_KEEP_PER_SCENARIO = 10;
function pruneLogs() {
  try {
    const dir = getLogDir();
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.log'));
    const groups = {};
    for (const f of files) {
      const sid = f.startsWith('_legacy_') ? '_legacy' : f.replace(/_\d{8}_\d{6}\.log$/, '');
      (groups[sid] = groups[sid] || []).push(f);
    }
    for (const sid of Object.keys(groups)) {
      const list = groups[sid];
      if (list.length <= LOG_KEEP_PER_SCENARIO) continue;
      list.sort();
      for (const f of list.slice(0, list.length - LOG_KEEP_PER_SCENARIO)) {
        try { fs.unlinkSync(path.join(dir, f)); } catch {}
      }
    }
  } catch {}
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
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.log'));
    const all = [];
    for (const f of files) {
      const scenarioId = f.startsWith('_legacy_') ? '_legacy' : f.replace(/_\d{8}_\d{6}\.log$/, '');
      try {
        const content = fs.readFileSync(path.join(dir, f), 'utf-8').trim();
        if (!content) continue;
        for (const line of content.split('\n')) {
          try {
            const entry = JSON.parse(line);
            entry.scenario = scenarioId;
            all.push(entry);
          } catch {}
        }
      } catch {}
    }
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

function getLogEntries(date, scenario) {
  try {
    let entries = _readAllLogFiles();
    if (date) entries = entries.filter(e => e.t && e.t.startsWith(date));
    if (scenario) entries = entries.filter(e => e.scenario === scenario);
    return entries;
  } catch { return []; }
}

function getLogScenarios() {
  try {
    const dir = getLogDir();
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.log'));
    const ids = new Set();
    for (const f of files) {
      const id = f.startsWith('_legacy_') ? '_legacy' : f.replace(/_\d{8}_\d{6}\.log$/, '');
      ids.add(id);
    }
    return [...ids];
  } catch { return []; }
}

/**
 * Clean up log files after migration/selfcheck.
 * Removes:
 * - Achievement entries whose condition is no longer met by current game
 *   state (even if the achievement was never in unlockedAchievements).
 * - Event/levelup entries whose source event text doesn't match any
 *   event still in the valid triggeredEvents list.
 */
function cleanupLogFiles(scenario, gs) {
  try {
    const dir = getLogDir();
    if (!fs.existsSync(dir)) return;
    // Compute achievement validity based on current game state
    const invalidAchNames = new Set();
    if (scenario && scenario.achievements && gs) {
      const titles = (scenario.titles || []).filter(t => t.level <= (gs.level || 1));
      for (const ach of scenario.achievements) {
        if (!ach.condition) continue;
        let ok = false;
        switch (ach.condition.type) {
          case 'level': ok = (gs.level || 0) >= ach.condition.value; break;
          case 'events': ok = (gs.triggeredEvents?.length || 0) >= ach.condition.value; break;
          case 'runtime': ok = (gs.totalRuntimeMs || 0) >= ach.condition.value; break;
          case 'titles': ok = titles.length >= ach.condition.value; break;
          default: ok = true;
        }
        if (!ok) invalidAchNames.add(ach.name);
      }
    }
    // Build a map of event text → event (for validating log entries)
    const eventTextMap = {};
    const validIds = gs?.triggeredEvents || [];
    if (scenario && scenario.events && validIds.length > 0) {
      for (const e of scenario.events) {
        if (e.text && validIds.includes(e.id)) {
          eventTextMap[e.text] = e;
        }
      }
    }
    // 节日/里程碑/大厅提醒文本不在场景事件表里，也纳入保留（防止自检误删）
    if (scenario && scenario.holidayEvents) {
      for (const h of scenario.holidayEvents) {
        if (h.text) eventTextMap[h.text] = { minLevel: 0 };
      }
    }
    for (const m of MILESTONES) eventTextMap[m.text] = { minLevel: 0 };
    for (const t of HUB_REMINDERS) eventTextMap[t] = { minLevel: 0 };
    // Build a map: branch → { level → event } for finding the correct event
    // at a given level in the player's current branch.
    const branchEventsByLevel = {};
    if (scenario && scenario.events) {
      const cb = gs?.currentBranch || '';
      for (const e of scenario.events) {
        const br = e.branch || '';
        if (br && br !== cb) continue;
        const lv = e.minLevel || 0;
        if (!branchEventsByLevel[lv]) branchEventsByLevel[lv] = [];
        branchEventsByLevel[lv].push(e);
      }
    }
    const logFiles = fs.readdirSync(dir).filter(f => f.endsWith('.log'));
    for (const fName of logFiles) {
      const fPath = path.join(dir, fName);
      const content = fs.readFileSync(fPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      const kept = [];
      let changed = false;
      for (const line of lines) {
        let entry;
        try { entry = JSON.parse(line); } catch { kept.push(line); continue; }
        // Filter achievement entries that are no longer valid
        if (entry.ty === 'achievement' && invalidAchNames.size > 0) {
          const colonIdx = entry.m ? entry.m.indexOf(':') : -1;
          const achName = colonIdx > 0 ? entry.m.slice(0, colonIdx) : '';
          if (invalidAchNames.has(achName)) { changed = true; continue; }
        }
        // Validate event/levelup entries: check that text matches an event
        // in the current triggeredEvents list, AND for levelup entries that
        // the log level matches the event's minLevel (fixing wrong-level
        // entries by replacing text with the correct event for that level).
        if ((entry.ty === 'event' || entry.ty === 'levelup') && Object.keys(eventTextMap).length > 0) {
          let eText = entry.m || '';
          let logLevel = 0;
          if (entry.ty === 'levelup') {
            const lvMatch = entry.m.match(/等级\s*(\d+)/);
            logLevel = lvMatch ? parseInt(lvMatch[1]) : 0;
            const sepIdx = eText.indexOf('—');
            if (sepIdx >= 0) eText = eText.slice(sepIdx + 1).trim();
            else { kept.push(line); continue; }
          }
          const matchedEvent = eventTextMap[eText];
          if (!matchedEvent) {
            changed = true; continue; // text not in valid events → remove
          }
          // For levelup entries: if the log level doesn't match the event's
          // minLevel, this was triggered at the wrong level. Replace with
          // the correct event text for that level.
          if (logLevel > 0 && logLevel !== (matchedEvent.minLevel || 0)) {
            const candidates = branchEventsByLevel[logLevel] || [];
            // Pick the first non-choice story event at that level
            const correct = candidates.find(e => validIds.includes(e.id) && !e.choice1 && e.text);
            if (correct) {
              const title = getCurrentTitle(scenario, logLevel);
              const titleStr = title ? title.name : '';
              const newMsg = '等级 ' + logLevel + '！' + titleStr + ' — ' + correct.text;
              entry.m = newMsg;
              entry = JSON.parse(JSON.stringify(entry)); // ensure plain obj
              changed = true;
            } else {
              // No correct event found → remove this stray entry
              changed = true; continue;
            }
          }
        }
        kept.push(JSON.stringify(entry));
      }
      // Deduplicate consecutive identical entries (artifact from text replacement)
      const deduped = [];
      for (let i = 0; i < kept.length; i++) {
        if (i === 0 || kept[i] !== kept[i - 1]) deduped.push(kept[i]);
      }
      if (changed) {
        const outContent = deduped.join('\n') + (deduped.length > 0 ? '\n' : '');
        fs.writeFileSync(fPath, outContent, 'utf-8');
        console.log('[cleanup-logs] cleaned ' + fName + ': removed ' + (lines.length - deduped.length) + ' entries');
      }
    }
  } catch (e) { console.error('[cleanup-logs] error:', e.message); }
}

// ── IPC Handlers ──

function readSave() {
  try {
    const sp = path.join(getAppDataPath(), getSaveFileName());
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
  if (IS_DEV) return; // dev 模式禁用存档同步
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
    const localTotal = gameState?.petTotalExp || 0;
    const cloudTotal = syncData.petTotalExp || 0;
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
      normalizeGameState(gameState);
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
      gameState.level = calcLevel(gameState.petTotalExp);
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
    const fileName = getSaveFileName();
    const tmpPath = path.join(dir, fileName + '.tmp');
    const finalPath = path.join(dir, fileName);
    fs.writeFileSync(tmpPath, JSON.stringify(data), 'utf-8');   // v4.1：改紧凑 JSON（原缩进美化体积翻倍）
    fs.renameSync(tmpPath, finalPath);
    const syncCfg = readSyncConfig();
    if (syncCfg && syncCfg.path && !silent) syncToCloud(syncCfg, silent);
  } catch (e) { console.error('Save failed:', e); appendLogEntry('error', `存档写入失败: ${e.message}`); }
}

// v4.1：云同步限流——非静默存盘会整目录拷贝日志，高频操作时改为最多每 20 秒一次
let _lastCloudSyncAt = 0;
const CLOUD_SYNC_MIN_INTERVAL_MS = 20000;

function syncToCloud(cfg, silent) {
  try {
    const now = Date.now();
    if (now - _lastCloudSyncAt < CLOUD_SYNC_MIN_INTERVAL_MS) return;
    _lastCloudSyncAt = now;
    const cloudDir = path.join(cfg.path, 'Idel-DreamMaker-Sync');
    if (!fs.existsSync(cloudDir)) fs.mkdirSync(cloudDir, { recursive: true });
    // 防回滚：云端存档更新时不覆盖
    const cloudSavePath = path.join(cloudDir, 'save.json');
    if (fs.existsSync(cloudSavePath)) {
      try {
        const cloudData = JSON.parse(fs.readFileSync(cloudSavePath, 'utf-8'));
        const localTotal = gameState?.petTotalExp || 0;
        const cloudTotal = cloudData.petTotalExp || 0;
        // 防回滚：云端进度更高时不覆盖（时间戳受本机写入顺序影响，进度才是可靠防线）
        if (cloudTotal > localTotal) {
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
      petTotalExp: { present: typeof gs.petTotalExp === 'number', value: gs.petTotalExp },
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
let gameLoopInterval = null;
let tooltipInterval = null;

// ── v4 配置常量（设计文档 §15.3，全部数值集中可调）──
const V4_CONFIG = {
  unlockIntervalSec: 1200,       // 解锁间隔：20 分钟/段（内容层 minSeconds 创作规范）
  typingStoryBonusSec: 2,        // 打字加速：1 击 = +2 秒有效时长（仅副本内）
  feedKeyRate: 100,              // 打字 100 击 = 1 食物（阶段 3）
  soapKeyRate: 200,              // 打字 200 击 = 1 肥皂（阶段 3）
  itemCap: 50,                   // 道具上限（阶段 3）
};

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
  const name = KEYCODE_TO_NAME[vk] || '';
  return /^(ShiftLeft|ShiftRight|CtrlLeft|CtrlRight|AltLeft|AltRight|MetaLeft|MetaRight|CapsLock|NumLock|ScrollLock|Insert|Home|End|PageUp|PageDown|Delete|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(name);
}

function handleInputDown(keyId, keyChar, now) {
  if (!gameState) return;
  // 去重：80ms 内重复=OS 按住自动重复（丢弃）；超时再来=keyup 丢失，视为新按下（防永久卡死）
  if (keyDown[keyId] && now - keyDown[keyId] < 80) return;
  keyDown[keyId] = now;

  gameState.totalKeyPresses = (gameState.totalKeyPresses || 0) + 1;
  gameState.dailyKeyPresses = (gameState.dailyKeyPresses || 0) + 1;

  // v4：打字加速故事解锁（仅副本内；打字=陪伴，+2 秒有效时长/击）
  if (!gameState.isInHub && gameState.scenarioId) {
    if (!gameState.scenarioProgress[gameState.scenarioId]) gameState.scenarioProgress[gameState.scenarioId] = {};
    gameState.scenarioProgress[gameState.scenarioId].storySeconds = (gameState.scenarioProgress[gameState.scenarioId].storySeconds || 0) + V4_CONFIG.typingStoryBonusSec;
  }

  lastKeyChar = keyChar;
  keyStream.push(now);
  keyStream = keyStream.filter(t => now - t <= KEY_STREAK_WINDOW);
  const streak = keyStream.length;
  if (streak > highestStreak) {
    highestStreak = streak;
    gameState.highestStreak = highestStreak;
  }
  const grade = getGrade(streak);

  if (grade && !gameState.comboMilestones) gameState.comboMilestones = [];
  if (grade && !gameState.comboMilestones.includes(grade)) {
    gameState.comboMilestones = [...gameState.comboMilestones, grade];
  }

  try { forwardToPet('key-combo', { streak, grade, keyChar, total: gameState.totalKeyPresses, daily: gameState.dailyKeyPresses }); } catch {}

  // v4.1：抉择只拦剧情推进（checkStoryUnlock 内部已判），不再冻结 EXP/道具/三维——
  // 挂机党晚上没点那个抉择，不该白挂一夜还饿着宠物（设计：等级只涨不清零、无惩罚）
  const mult = getComboMultiplier(grade);
  const keyExp = 1.0 * mult * (1 + getPetExpBonus());
  gameState.petTotalExp = (gameState.petTotalExp || 0) + keyExp;
  gameState.exp = gameState.petTotalExp;

  // v4 饲养：打字恢复（饱食 +0.004/击、清洁 +0.003/击）+ 攒道具（100 击=1 食物、200 击=1 肥皂，上限 50）
  gameState.petFullness = clamp100((gameState.petFullness || 80) + 0.004);
  gameState.petCleanliness = clamp100((gameState.petCleanliness || 80) + 0.003);
  gameState.petFoodAccum = (gameState.petFoodAccum || 0) + 1;
  if (gameState.petFoodAccum >= V4_CONFIG.feedKeyRate) {
    gameState.petFoodAccum -= V4_CONFIG.feedKeyRate;
    if (gameState.petFoods < V4_CONFIG.itemCap) {
      gameState.petFoods = (gameState.petFoods || 0) + 1;   // 攒出食物（静默，不弹气泡——用户要求）
    }
  }
  gameState.petSoapAccum = (gameState.petSoapAccum || 0) + 1;
  if (gameState.petSoapAccum >= V4_CONFIG.soapKeyRate) {
    gameState.petSoapAccum -= V4_CONFIG.soapKeyRate;
    if (gameState.petSoaps < V4_CONFIG.itemCap) {
      gameState.petSoaps = (gameState.petSoaps || 0) + 1;   // 攒出肥皂（静默，不弹气泡——用户要求）
    }
  }

  const ol = gameState.level;
  gameState.level = calcLevel(gameState.petTotalExp);
  if (gameState.level > ol) {
    const title = getCurrentTitle(currentScenario, gameState.level);
    // v4：升级不再触发故事（故事由时间解锁驱动），仅更新称号 + 挂起升级台词
    if (title) {
      currentTitle = title;
      if (currentScenario) gameState.equippedTitleIndex = currentScenario.titles.indexOf(title);
    }
    queuePetLineLayer('levelup');
    const luPayload = { level: gameState.level, title: title ? title.name : null, titleColor: title ? title.color : null, titleDesc: title ? title.desc : null, eventText: null };
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
      keyDown[e.keycode] = 0;
    });
    uIOhook.on('mousedown', (e) => {
      if (e.button < 0 || e.button > 3) return;
      const keyId = 'mouse_' + e.button;
      const keyChar = e.button === 0 ? '🖱L' : e.button === 1 ? '🖱M' : e.button === 2 ? '🖱R' : '🖱X';
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
  const today = getLocalDateStr();
  if (gameState.keyPressDate !== today) {
    gameState.dailyKeyPresses = 0;
    gameState.keyPressDate = today;
  }
}

// ── Game Logic ──
// 升级曲线公式统一由 level-curve.cjs 提供（calcLevel / calcExpForLevel）

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

// ── v4 饲养引擎：三维衰减/恢复 + 三档加成 ──
// 数值表（设计文档 §6.1）：饱食 -4/h（喂食 +10 耗 1 食物、打字 +0.004/击）
// 心情 -2.5/h（抚摸 +4、饱食≥60 不掉反涨 +2/h）；清洁 -1.5/h（洗澡 +10 耗 1 肥皂、打字 +0.003/击）
function applyPetDecay(state, ms) {
  const hours = ms / 3600000;
  if (!state || typeof state.petFullness !== 'number') return;
  // 饱食
  state.petFullness = clamp100(state.petFullness - 4 * hours);
  // 心情：饱食≥60 不掉反涨 +2/h
  const moodDelta = state.petFullness >= 60 ? (2 * hours) : (-2.5 * hours);
  state.petMood = clamp100(state.petMood + moodDelta);
  // 清洁
  state.petCleanliness = clamp100(state.petCleanliness - 1.5 * hours);
}

function clamp100(v) {
  return Math.max(0, Math.min(100, v));
}

// 三档加成：三维全绿≥60 → +30%；两维 → +10%；其余 0%
function getPetExpBonus() {
  if (!gameState) return 0;
  const f = gameState.petFullness >= 60;
  const m = gameState.petMood >= 60;
  const c = gameState.petCleanliness >= 60;
  const green = (f ? 1 : 0) + (m ? 1 : 0) + (c ? 1 : 0);
  if (green >= 3) return 0.3;
  if (green >= 2) return 0.1;
  return 0;
}

// 任一维度 <30 → 萎靡（动画/宠物语阶段 5 接入，这里提供状态判断）
function isPetDroopy() {
  if (!gameState) return false;
  return gameState.petFullness < 30 || gameState.petMood < 30 || gameState.petCleanliness < 30;
}

// ── v4 宠物语引擎（设计文档 §7）：抽取/触发 ──
let _lastPetLine = { layer: '', index: -1 };

function pickPetLine(layer) {
  const group = PET_LINES.lines[layer];
  if (!group) return '';
  const gender = gameState?.petGender;
  const genderPool = gender === 'male' ? (group.male || []) : gender === 'female' ? (group.female || []) : [];
  // 70/30 抽取：中性只用通用池；有性别池时 30% 概率用性别池
  const useGender = gender && genderPool.length > 0 && Math.random() < 0.3;
  const pool = useGender ? genderPool : (group.common || []);
  if (!pool || pool.length === 0) return '';
  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && _lastPetLine.layer === layer && _lastPetLine.index === idx) {
    idx = (idx + 1) % pool.length;   // 同层不连续重复
  }
  _lastPetLine = { layer, index: idx };
  // 称谓替换：台词中"主人"占位 → 玩家称谓（未设置保持"主人"）
  const callName = gameState?.petCallName || '主人';
  return callName !== '主人' ? pool[idx].replace(/主人/g, callName) : pool[idx];
}

function showPetLine(layer) {
  const text = pickPetLine(layer);
  if (!text) return;
  gameState._lastPetLineAt = Date.now();   // 台词冷却时间戳（30s 内不重复弹）
  forwardToPet('pet-line', { text });
}

// 特定时刻台词挂起：升级/成就/进世界时设置，下次点击宠物优先说（绝不主动弹出）
function queuePetLineLayer(layer) {
  if (!gameState) return;
  gameState._pendingPetLine = layer;
}

// 系统提示短气泡（宠物窗口，6s 自动消失；喂食/洗澡失败等轻量反馈）
function sendPetToast(text) {
  try { forwardToPet('pet-toast', { text }); } catch {}
}

// 节日台词：按节日 id 专属池抽取（冷门节日无池 → 返回空，走普通台词）
function pickHolidayLine() {
  const hid = getTodaysHolidayId();
  if (!hid) return '';
  const pool = PET_LINES.lines.holiday[hid];
  if (!pool || pool.length === 0) return '';
  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && _lastPetLine.layer === 'holiday_' + hid && _lastPetLine.index === idx) {
    idx = (idx + 1) % pool.length;
  }
  _lastPetLine = { layer: 'holiday_' + hid, index: idx };
  const callName = gameState?.petCallName || '主人';
  return callName !== '主人' ? pool[idx].replace(/主人/g, callName) : pool[idx];
}

function resetGameForScenario(scenario, alias) {
  gameState.scenarioId = scenario.id;
  gameState._storyEnded = false;              // v4.1：进入世界/换世界 → 解除"已读到结局"收尾状态
  if (gameState.pendingChoiceEvent) {
    appendLogEntry('info', `切换世界，放弃未完成的抉择 (${gameState.pendingChoiceEvent.eventId})`);
    gameState.pendingChoiceEvent = null;
  }
  const p = gameState.scenarioProgress && gameState.scenarioProgress[scenario.id];
  // 大厅成就与通关成就是全局永久的，切换副本时保留，防止重复解锁弹窗
  const hubPersist = (gameState.unlockedAchievements || []).filter(id => id.startsWith('hub_') || id.startsWith('completion_'));
  // v4 等级单轨化：宠物等级全局，副本不再存/恢复经验
  gameState.level = calcLevel(gameState.petTotalExp);
  gameState.exp = gameState.petTotalExp;
  if (p) {
    // v4.0：陪伴总时长改为全局累计（换世界不清零，玩家最在意的数字之一）；单世界时长另存于 scenarioProgress[sid].totalRuntimeMs
    gameState.triggeredEvents = p.triggeredEvents ? [...p.triggeredEvents] : [];
    gameState.unlockedAchievements = [...new Set([...hubPersist, ...(p.unlockedAchievements || [])])];
    gameState.equippedTitleIndex = p.equippedTitleIndex || 0;
    gameState.currentBranch = p.currentBranch || '';
  } else {
    // 首次进入这个世界：不清零全局陪伴时长，只补一个进度容器
    gameState.scenarioProgress[scenario.id] = { ...(gameState.scenarioProgress[scenario.id] || {}), totalRuntimeMs: 0 };
    gameState.triggeredEvents = [];
    gameState.unlockedAchievements = hubPersist;
    gameState.equippedTitleIndex = 0;
    gameState.currentBranch = '';
  }
  gameState.isInHub = false;
  gameState.scenarioAlias = alias || '';
  currentScenario = scenario;

  // v4：进入世界时检查时间解锁（storySeconds 够则挂出待读/弹抉择）
  gameState._pendingStoryEvent = null;
  queuePetLineLayer('special');   // 进世界台词（下次点击说）
  checkStoryUnlock();
  setLogSession(scenario.id);
}

function exitToHub() {
  clearLogSession();
  if (gameState.pendingChoiceEvent) {
    appendLogEntry('info', '返回家，放弃未完成的抉择');
    gameState.pendingChoiceEvent = null;
  }
  const unlocked = getUnlockedTitles(currentScenario, gameState.level).map(t => t.name);
  const sid = gameState.scenarioId;
  if (sid) {
    if (!gameState.unlockedTitleSets) gameState.unlockedTitleSets = {};
    gameState.unlockedTitleSets[sid] = unlocked;

    // v4：经验全局（petTotalExp），出副本不再折算入大厅
    // v4.0 修复：整对象要先用旧值打底——原来重建对象会丢掉 storySeconds（回大厅后剧情计时归零，下一段永远解锁不出来）
    gameState.scenarioProgress[sid] = {
      ...(gameState.scenarioProgress[sid] || {}),
      totalRuntimeMs: (gameState.scenarioProgress[sid] && gameState.scenarioProgress[sid].totalRuntimeMs) || 0,
      triggeredEvents: [...gameState.triggeredEvents],
      unlockedAchievements: [...gameState.unlockedAchievements],
      equippedTitleIndex: gameState.equippedTitleIndex,
      currentBranch: gameState.currentBranch || '',
    };
  }

  gameState.scenarioId = '';
  gameState.isInHub = true;
  gameState.currentBranch = '';
  gameState.pendingChoiceEvent = null;
  gameState._storyEnded = false;              // v4.1：回大厅 → 清收尾状态
  currentScenario = null;
  currentTitle = null;
}

function checkFlagRequire(flagRequire) {
  if (!flagRequire) return true;
  const flags = gameState.flags || {};
  // 与 applyFlagSet 的 ';' 分隔约定保持一致：'/' ; / '&' 都是 AND，'|' 是 OR
  const parts = flagRequire.split(/[;&]/);
  for (const part of parts) {
    const orParts = part.split('|');
    let anyMatch = false;
    for (const op of orParts) {
      const trimmed = op.trim();
      if (!trimmed) continue;
      // 运算符顺序：>= / <= 必须在 > / < 之前匹配
      const match = trimmed.match(/^([a-zA-Z_]\w*)\s*(>=|<=|==|=|>|<)\s*(.+)$/);
      if (!match) {
        // 裸 flag 名：存在即满足
        if (flags[trimmed]) anyMatch = true;
        continue;
      }
      const [, key, opStr, valStr] = match;
      const flagVal = flags[key];
      if (flagVal === undefined) continue;
      const valT = valStr.trim();
      if (opStr === '=' || opStr === '==') {
        // 归一化比较：布尔 true ↔ '1' ↔ 'true' 等价，布尔 false ↔ '0' ↔ 'false' 等价
        const norm = v => (typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v).trim());
        const nv = norm(flagVal);
        const nt = norm(valT);
        anyMatch = nv === nt ||
          (nv === 'true' && nt === '1') || (nv === '1' && nt === 'true') ||
          (nv === 'false' && nt === '0') || (nv === '0' && nt === 'false');
        continue;
      }
      const normVal = typeof flagVal === 'boolean' ? (flagVal ? 1 : 0) : flagVal;
      const numA = normVal === '' ? NaN : Number(normVal);
      const numB = valT === '' ? NaN : Number(valT);
      const numeric = !isNaN(numA) && !isNaN(numB);
      let ok = false;
      switch (opStr) {
        case '>': ok = numeric ? numA > numB : String(normVal) > valT; break;
        case '>=': ok = numeric ? numA >= numB : String(normVal) >= valT; break;
        case '<': ok = numeric ? numA < numB : String(normVal) < valT; break;
        case '<=': ok = numeric ? numA <= numB : String(normVal) <= valT; break;
      }
      if (ok) anyMatch = true;
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
    let match = trimmed.match(/^([a-zA-Z_]\w*)\s*(\+=|-=|=)\s*(.+)$/);
    if (!match) {
      gameState.flags[trimmed] = true;
      continue;
    }
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

function nextStoryEvent(type, cb) {
  if (!currentScenario || !currentScenario.events || gameState.isInHub) return null;
  if (cb === undefined) cb = gameState.currentBranch || '';
  // choice target 不应被自动触发（只能由选择触发），避免未选分支文本后续弹出
  const targetIds = new Set();
  for (const e of currentScenario.events) {
    if (e.choice1Target) targetIds.add(e.choice1Target);
    if (e.choice2Target) targetIds.add(e.choice2Target);
    if (e.choice3Target) targetIds.add(e.choice3Target);
    if (e.choice4Target) targetIds.add(e.choice4Target);
  }
  const sid = gameState.scenarioId;
  const prog = (gameState.scenarioProgress && gameState.scenarioProgress[sid]) || {};
  const storySeconds = prog.storySeconds || 0;
  // 重访浏览模式：已通关世界走新分支时不卡时间（连续浏览）
  const browse = !!prog.continuousBrowse;
  const pool = currentScenario.events.filter(e => {
    if (e.type && e.type !== type) return false;
    if (!browse && e.minSeconds && e.minSeconds > storySeconds) return false;
    if (e.once && gameState.triggeredEvents.includes(e.id)) return false;
    if (e.branch && e.branch !== '' && e.branch !== cb) return false;
    if (!checkFlagRequire(e.flagRequire)) return false;
    if (targetIds.has(e.id)) return false;  // 排除 choice target
    return true;
  });
  if (pool.length === 0) return null;
  // 顺序推进：取 minSeconds 最小的（时间门槛最低的下一段）
  pool.sort((a, b) => (a.minSeconds || 0) - (b.minSeconds || 0));
  return pool[0];
}

// ── v4 时间解锁核心：检查顺序链下一段（普通段挂待读气泡，抉择段直接弹抉择）──
function checkStoryUnlock() {
  if (!currentScenario || gameState.isInHub) return;
  // v4.1：本世界已读到结局 → 收尾，不再往下推（原来 Lv.500 有 55 个结局段，
  // 踩中多个 flag 的玩家会一段接一段读到好几个结局，每次弹一次"旅程完成"面板）
  if (gameState._storyEnded) return;
  if (gameState.pendingChoiceEvent) return;    // 抉择阻塞：不推进
  if (gameState._pendingStoryEvent) return;    // 已有待读气泡：不重复推送
  const sid = gameState.scenarioId;
  // 隐藏链：全分支通关后激活
  const bp = (gameState.branchProgress && gameState.branchProgress[sid]) || [];
  const branches = currentScenario.branches || [];
  const hiddenActive = branches.length > 0 && branches.every(b => bp.includes(b));
  // v4.1：隐藏链激活后优先推隐藏段——否则会先弹掉残余的分支结局（flag 兜底结局等），
  // 被 _storyEnded 收尾挡住，隐藏链反而要玩家再退出重进一次才看得到
  let ev = hiddenActive ? nextStoryEvent('story', 'hidden') : null;
  if (!ev) ev = nextStoryEvent('story');
  if (!ev) return;
  if (ev.choice1 && ev.choice1Target) {
    // 抉择段：解锁即弹抉择（正文+选项，不选不推进）
    gameState.triggeredEvents.push(ev.id);
    gameState.pendingChoiceEvent = { eventId: ev.id, scenarioId: sid, title: '抉择', text: ev.text, choices: buildChoices(ev) };
    const cp = { title: '抉择', text: ev.text, choices: buildChoices(ev), _eventId: ev.id };
    try { mainWindow.webContents.send('choice-event', cp); } catch {}
    forwardToPet('choice-event', cp);
  } else {
    // 普通故事段：挂待读气泡（常驻不自动读，点击 story-read 推进）
    gameState._pendingStoryEvent = { id: ev.id, title: ev.completionTitle ? '结局' : '故事', text: ev.text };
    const sp = { eventId: ev.id, title: ev.completionTitle ? '结局' : '故事', text: ev.text, isEnding: !!ev.completionTitle };
    try { mainWindow.webContents.send('story-ready', sp); } catch {}
    forwardToPet('story-ready', sp);
  }
}

// ── v4.1 剧情进度：给宠物窗显示"下一段约 X 分钟"（口径与 nextStoryEvent 一致）──
function getStoryProgress() {
  if (!currentScenario || gameState.isInHub) return null;
  if (gameState._storyEnded) return null;      // 本世界已读到结局：不再推进，不显示进度
  const sid = gameState.scenarioId;
  const prog = (gameState.scenarioProgress && gameState.scenarioProgress[sid]) || {};
  if (prog.continuousBrowse) return null;      // 重访=连续浏览，不卡时间，不显示进度
  const ss = prog.storySeconds || 0;
  const cb = gameState.currentBranch || '';
  const targetIds = new Set();
  for (const e of currentScenario.events) {
    if (e.choice1Target) targetIds.add(e.choice1Target);
    if (e.choice2Target) targetIds.add(e.choice2Target);
    if (e.choice3Target) targetIds.add(e.choice3Target);
    if (e.choice4Target) targetIds.add(e.choice4Target);
  }
  const pool = currentScenario.events.filter(e => {
    if (e.type && e.type !== 'story') return false;
    if (e.once && gameState.triggeredEvents.includes(e.id)) return false;
    if (e.branch && e.branch !== '' && e.branch !== cb) return false;
    if (!checkFlagRequire(e.flagRequire)) return false;
    if (targetIds.has(e.id)) return false;
    return true;
  });
  if (pool.length === 0) return null;
  pool.sort((a, b) => (a.minSeconds || 0) - (b.minSeconds || 0));
  const target = pool[0].minSeconds || 0;
  const remain = Math.max(0, target - ss);
  return {
    pct: target > 0 ? Math.min(100, Math.round((ss / target) * 1000) / 10) : 100,
    remain: Math.round(remain),
    isChoice: !!(pool[0].choice1 && pool[0].choice1Target),
  };
}

// ── v4 分支通关：结局事件（带 CompletionTitle）读完 → 通关记录 + 旅程完成弹窗 ──
function handleBranchEnding(ev) {
  const sid = gameState.scenarioId;
  const cb = ev.branch || gameState.currentBranch || '';
  if (cb) {
    if (!gameState.branchProgress) gameState.branchProgress = {};
    if (!gameState.branchProgress[sid]) gameState.branchProgress[sid] = [];
    if (!gameState.branchProgress[sid].includes(cb)) gameState.branchProgress[sid].push(cb);
  }
  // 解锁通关称号（结局事件 completionTitle）
  const endingTitle = ev.completionTitle || currentScenario?.completion_title || '';
  if (endingTitle) {
    if (!gameState.unlockedCompletionTitles) gameState.unlockedCompletionTitles = [];
    if (!gameState.unlockedCompletionTitles.find(c => c.scenarioId === sid && c.title === endingTitle)) {
      gameState.unlockedCompletionTitles.push({
        scenarioId: sid,
        scenarioName: currentScenario?.name_cn || currentScenario?.nameCN || currentScenario?.name || sid,
        title: endingTitle,
        branch: cb,
      });
    }
  }
  if (!gameState.gameCompletions) gameState.gameCompletions = [];
  if (!gameState.gameCompletions.some(c => c.scenarioId === sid)) {
    gameState.gameCompletions.push({ scenarioId: sid, date: getLocalDateStr(), branch: cb });
  }
  // 首次通关永久成就
  const completionAchId = 'completion_' + sid;
  if (!gameState.unlockedAchievements.includes(completionAchId)) {
    gameState.unlockedAchievements.push(completionAchId);
    const achPayload = { id: completionAchId, name: '圆满', desc: (currentScenario?.name_cn || currentScenario?.nameCN || sid) + '·圆满', icon: '★' };
    try { mainWindow.webContents.send('achievement-unlocked', achPayload); } catch {}
    forwardToPet('achievement-unlocked', achPayload);
  }
  const endingPayload = {
    scenarioId: sid,
    scenarioName: currentScenario?.name_cn || currentScenario?.nameCN || currentScenario?.name || sid,
    text: ev.text,
    endingTitle,
    branch: cb,
  };
  try { mainWindow.webContents.send('scenario-ending', endingPayload); } catch {}
  forwardToPet('scenario-ending', endingPayload);
  // v4.1：读到结局即收尾——本世界不再往下推（避免连续弹多个"旅程完成"）
  gameState._storyEnded = true;
  gameState._pendingStoryEvent = null;
  checkHubAchievements();
}

// v4：节日事件/里程碑系统已取消（节日走宠物语台词池，陪伴时长走成就阶梯）
// checkHolidayEvent / checkMilestones 已删除

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
// v4：里程碑事件系统取消（MILESTONES/checkMilestones 保留定义但不再调用，陪伴时长走成就阶梯）

// 在家停留提醒（家语境，v4）
const HUB_REMINDERS = [
  '家里的挂钟滴答作响，空气中有一丝茶香。',
  '窗外似乎有什么东西一闪而过。',
  '墙上的地图又多了几道你不记得画过的痕迹。',
  '壁炉里的火苗轻轻跳动着。',
  '角落里那把旧椅子看起来比上次更旧了。',
  '在家待着也是陪伴，不过故事还在世界里等着你。',
  '已经在家待了好一会儿，不选个世界看看吗？',
  '世界才是故事发生的地方——选一个出发吧。',
  '在家不会触发故事，故事都在世界里。',
  '家是休息的地方，故事要去世界里看。',
];

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
        // v4.1：用高水位判定（只增不减），避免清理/重访导致已解锁成就被收回
        met = Math.max(gameState.triggeredEvents.length, gameState.petEventsPeak || 0) >= a.condition.value;
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

// v4.1 优化：game-tick 里的历史数组（触发事件/成就/通关记录/flags）只在变化时下发。
// 指纹用「长度 + 末元素」——这些数组以追加为主，末元素变化即可判定；flags 小，直接序列化比对。
let _tickArrSig = { triggered: '', achievements: '', completions: '', flags: '' };
function _arrSigOf(a) { return Array.isArray(a) && a.length ? a.length + '|' + a[a.length - 1] : '0'; }

function startGameLoop() {
  if (gameLoopInterval) return;
  hubIdleMs = 0;
  lastHubReminderMs = 0;

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
      pet_total_exp: gameState.petTotalExp,
      total_runtime_ms: gameState.totalRuntimeMs,
      equipped_title_index: gameState.equippedTitleIndex,
      is_in_hub: gameState.isInHub,
      language: gameState.language,
      currentTitle: currentTitle ? currentTitle.name : null,
      scenario_name: currentScenario ? (currentScenario.name_cn || currentScenario.nameCN || currentScenario.name) : null,
      theme: gameState.selectedFontTheme || 'green',
      custom_theme: gameState.customTheme || null,
      pet_level: calcLevel(gameState.petTotalExp),
      pet_fullness: gameState.petFullness || 80,
      pet_mood: gameState.petMood || 80,
      pet_cleanliness: gameState.petCleanliness || 80,
      pet_foods: gameState.petFoods || 0,
      pet_soaps: gameState.petSoaps || 0,
      pet_droopy: isPetDroopy(),
      pet_gender: gameState.petGender,
      current_branch: gameState.currentBranch || '',
      completed_branches: (gameState.branchProgress && gameState.branchProgress[gameState.scenarioId]) || [],
      mechanic: currentScenario ? (currentScenario.mechanic || 'standard') : 'standard',
      hub_title: gameState?.equippedCompletionTitle?.title || getHubTitle(calcLevel(gameState.petTotalExp)).name,
      total_key_presses: gameState.totalKeyPresses || 0,
      daily_key_presses: gameState.dailyKeyPresses || 0,
      buff_multiplier: buffMultiplier,
      buff_remaining: buffExpireTime ? Math.max(0, buffExpireTime - Date.now()) : 0,
    };
    // v4.1：剧情进度（宠物窗"下一段约 X 分钟"）——-1 表示不适用（在家/重访/已读完）
    const _sp = getStoryProgress();
    payload.story_pct = _sp ? _sp.pct : -1;
    payload.story_remain = _sp ? _sp.remain : -1;
    payload.story_is_choice = _sp ? _sp.isChoice : false;
    // v4.1 优化：历史数组只在变化时下发（否则每 500ms 重复搬运全部历史 id）。
    // 渲染端用 { ...gameState, ...p } 合并，缺省键保留旧值，语义不变。
    const arrSig = {
      triggered: _arrSigOf(gameState.triggeredEvents),
      achievements: _arrSigOf(gameState.unlockedAchievements),
      completions: _arrSigOf(gameState.gameCompletions),
      flags: JSON.stringify(gameState.flags || {}),
    };
    if (arrSig.triggered !== _tickArrSig.triggered) payload.triggered_events = gameState.triggeredEvents || [];
    if (arrSig.achievements !== _tickArrSig.achievements) payload.unlockedAchievements = gameState.unlockedAchievements || [];
    if (arrSig.completions !== _tickArrSig.completions) payload.gameCompletions = gameState.gameCompletions || [];
    if (arrSig.flags !== _tickArrSig.flags) payload.flags = gameState.flags || {};
    _tickArrSig = arrSig;
    try { mainWindow.webContents.send('game-tick', payload); } catch {}
    forwardToPet('game-tick', payload);
    // v4.1：pet-state 与 game-tick 内容重叠，已合并（原先每 tick 多发一包）

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

    // v4 饲养：每 tick 三维衰减（真实时间结算）
    applyPetDecay(gameState, delta);
    gameState.petStateUpdatedAt = Date.now();

    // v4 时间解锁：副本内累计有效时长（挂机 1s=1s；打字加速在 handleInputDown）
    const sid = gameState.scenarioId;
    if (!gameState.scenarioProgress[sid]) gameState.scenarioProgress[sid] = {};
    gameState.scenarioProgress[sid].storySeconds = (gameState.scenarioProgress[sid].storySeconds || 0) + delta / 1000;
    // v4.0：单世界陪伴时长与全局总时长分别累计（全局值换世界不清零）
    gameState.scenarioProgress[sid].totalRuntimeMs = (gameState.scenarioProgress[sid].totalRuntimeMs || 0) + delta;

    // v4.1：抉择只拦剧情推进（checkStoryUnlock 内部已判 pendingChoiceEvent 并直接返回），
    // 这里不再 return——否则没点抉择时 EXP/成就/陪伴时长全停，挂机党白挂一夜（设计：无惩罚）
    // v4 时间解锁检查：顺序链下一段（取代旧 catch-up/升级触发）
    checkStoryUnlock();

    gameState.totalRuntimeMs += delta;
    let expMultiplier = 1;
    const mechanic = currentScenario?.mechanic || 'standard';
    if (mechanic === 'cultivation') {
      const hour = new Date().getHours();
      expMultiplier = (hour >= 6 && hour < 18) ? 1.5 : 0.7;
    } else if (mechanic === 'cyber') {
      // 5% 概率故障：每个 10 分钟块只掷一次骰（而非每 tick 掷）
      const tenMinBlock = Math.floor(gameState.totalRuntimeMs / 600000);
      if (tenMinBlock !== gameState._lastCyberBlock) {
        gameState._lastCyberBlock = tenMinBlock;
        const cyberKey = 'cyber_fault_' + tenMinBlock;
        if (!gameState.triggeredEvents.includes(cyberKey) && Math.random() < 0.05) {
          gameState.triggeredEvents.push(cyberKey);
          gameState.cyberFaultUntil = Date.now() + 30000;  // 暂停 30 秒
        }
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
    const expGain = (delta / 1000) * expMultiplier * buffMultiplier * (1 + getPetExpBonus());
    gameState.petTotalExp = (gameState.petTotalExp || 0) + expGain;
    gameState.exp = gameState.petTotalExp;

    // Buff expiry check
    if (buffExpireTime && Date.now() >= buffExpireTime) {
      buffExpireTime = 0;
      buffMultiplier = 1;
      buffCooldownUntil = Date.now() + 30000;
    }

    // Level up check — v4：升级不再触发故事（故事由时间解锁驱动）
    const oldLevel = gameState.level;
    gameState.level = calcLevel(gameState.petTotalExp);
    if (gameState.level > oldLevel) {
      const title = getCurrentTitle(currentScenario, gameState.level);
      if (title) {
        currentTitle = title;
        gameState.equippedTitleIndex = currentScenario.titles.indexOf(title);
      }
      queuePetLineLayer('levelup');
      const luPayload = { level: gameState.level, title: title ? title.name : null, titleColor: title ? title.color : null, titleDesc: title ? title.desc : null, eventText: null };
      try { mainWindow.webContents.send('level-up', luPayload); } catch {}
      forwardToPet('level-up', luPayload);
    }

    // v4：通关由分支结局事件驱动（handleBranchEnding，story-read 时触发），
    // 里程碑/节日事件系统已取消（陪伴时长走成就阶梯，节日走宠物语台词池）

    // Daily login ritual (once per day)
    if (!gameState.isInHub && currentScenario) {
      const today = getLocalDateStr();
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

    // v4.1：事件计数高水位（事件类成就只增不减，见设计文档 §8.1）
    if (gameState.triggeredEvents.length > (gameState.petEventsPeak || 0)) {
      gameState.petEventsPeak = gameState.triggeredEvents.length;
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

    // v4 成就阶梯 + 里程碑（多档合并为单条通知，不轰炸）
    const tierUnlocks = checkTierAchievements();
    const milUnlocks = checkMilestoneAchievements();
    const allNew = [...tierUnlocks, ...milUnlocks];
    if (allNew.length > 0) {
      queuePetLineLayer('achievement');   // 成就祝贺台词（下次点击说）
      const merged = {
        id: allNew.map(a => a.id).join(','),
        name: allNew.length > 1 ? `成就 +${allNew.length}` : allNew[0].name,
        desc: allNew.map(a => a.name).join(' / '),
        icon: '★',
      };
      try { mainWindow.webContents.send('achievement-unlocked', merged); } catch {}
      forwardToPet('achievement-unlocked', merged);
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

function serializeGame() {
  return {
    player_name: gameState.playerName,
    scenario_id: gameState.scenarioId,
    level: gameState.level,
    exp: gameState.exp,
    pet_total_exp: gameState.petTotalExp,
    total_runtime_ms: gameState.totalRuntimeMs,
    equipped_title_index: gameState.equippedTitleIndex,
    is_in_hub: gameState.isInHub,
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
    gameCompletions: gameState.gameCompletions || [],
    current_branch: gameState.currentBranch || '',
    completed_branches: (gameState.branchProgress && gameState.branchProgress[gameState.scenarioId]) || [],
    flags: gameState.flags || {},
    // v4 宠物侧数据（主窗口档案中心/状态条用）
    pet_level: calcLevel(gameState.petTotalExp),
    pet_fullness: gameState.petFullness || 80,
    pet_mood: gameState.petMood || 80,
    pet_cleanliness: gameState.petCleanliness || 80,
    pet_foods: gameState.petFoods || 0,
    pet_soaps: gameState.petSoaps || 0,
    pet_gender: gameState.petGender,
    pet_call_name: gameState.petCallName || '',
    pet_stories_read: gameState.petStoriesRead || 0,
    pet_hidden_read: gameState.petHiddenRead || 0,
    tier_achievements: gameState.tierAchievements || {},
    last_seen_changelog_version: gameState.lastSeenChangelogVersion || '',
  };
}

function registerIpcHandlers() {
  ipcMain.handle('get-full-state', () => {
    if (!gameState) return null;
    const currentTitleData = currentTitle || (currentScenario ? { name: currentScenario.playerTitle, color: '#888', desc: '' } : null);
    return {
      game: serializeGame(),
      petLevel: calcLevel(gameState.petTotalExp),
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
      // v4：经验全局，切副本不再折算
      // v4.0 修复：同样要用旧值打底，保留 storySeconds（否则切世界会丢剧情计时）
      gameState.scenarioProgress[oldSid] = {
        ...(gameState.scenarioProgress[oldSid] || {}),
        totalRuntimeMs: (gameState.scenarioProgress[oldSid] && gameState.scenarioProgress[oldSid].totalRuntimeMs) || 0,
        triggeredEvents: [...gameState.triggeredEvents],
        unlockedAchievements: [...gameState.unlockedAchievements],
        equippedTitleIndex: gameState.equippedTitleIndex,
        currentBranch: gameState.currentBranch || '',
        choiceFlags: gameState.choiceFlags ? { ...gameState.choiceFlags[oldSid] } : undefined,
      };
    }
    // 点的是当前副本，不做任何事（仅当在副本内时触发）
    if (!gameState.isInHub && id === gameState.scenarioId) {
      return { game: serializeGame(), scenario: currentScenario ? { id: currentScenario.id, name: currentScenario.name, nameCN: currentScenario.name_cn || currentScenario.nameCN, playerTitle: currentScenario.playerTitle || currentScenario.player_title, titles: currentScenario.titles } : null };
    }
    const scenario = findScenarioById(id);
    if (!scenario) throw new Error(`Scenario '${id}' not found`);
    // v4 重访检测：已通关世界 → 前端弹起点选择（从头重温/从抉择处继续）
    const bp = (gameState.branchProgress && gameState.branchProgress[id]) || [];
    const worldRevisited = bp.length > 0;
    const aliasStr = alias || '';
    resetGameForScenario(scenario, aliasStr);
    hubIdleMs = 0;
    lastHubReminderMs = 0;
    writeSave(gameState);
    try { mainWindow.webContents.send('scenario-changed', {
      game: serializeGame(),
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
      game: serializeGame(),
      worldRevisited,
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

  // v4 重访起点：restart=从头重温（清该世界故事进度）/ continue=从当前进度继续（连续浏览）
  ipcMain.handle('revisit-start', (_, { mode }) => {
    if (!gameState || gameState.isInHub || !gameState.scenarioId) return { success: false, error: '未在世界中' };
    const sid = gameState.scenarioId;
    if (!gameState.scenarioProgress[sid]) gameState.scenarioProgress[sid] = {};
    gameState._storyEnded = false;              // v4.1：重访 → 解除收尾状态（可以走新分支/重温）
    if (mode === 'restart') {
      gameState.triggeredEvents = [];
      gameState.currentBranch = '';
      gameState.flags = {};
      if (gameState.branchProgress) gameState.branchProgress[sid] = [];
      gameState.pendingChoiceEvent = null;
      gameState._pendingStoryEvent = null;
    }
    gameState.scenarioProgress[sid].continuousBrowse = true;   // 重访=连续浏览（不卡时间）
    writeSave(gameState);
    gameState._pendingStoryEvent = null;
    checkStoryUnlock();
    return { success: true, game: serializeGame() };
  });

  ipcMain.handle('exit-to-hub', () => {
    try { forwardToPet('dismiss-choice', {}); } catch {}
    exitToHub();
    writeSave(gameState);
    return { petTotalExp: gameState.petTotalExp, petLevel: calcLevel(gameState.petTotalExp) };
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

  ipcMain.handle('get-log-entries', (_, { date, scenario }) => {
    return getLogEntries(date, scenario);
  });

  ipcMain.handle('get-log-scenarios', () => {
    return getLogScenarios();
  });

  ipcMain.handle('reload-scenario-data', () => {
    try {
      // Reload scenarios from scenarios_data.json and rebuild allScenarios.
      const dataPath = path.join(__dirname, '..', 'public', 'scenarios_data.json');
      if (fs.existsSync(dataPath)) {
        const loaded = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        if (loaded && loaded.length > 0) {
          const oldLen = allScenarios.length;
          allScenarios = loaded;
          // 合并用户自制副本（避免覆盖丢失）
          const userDir = path.join(__dirname, '..', 'scenarios_user');
          if (fs.existsSync(userDir)) {
            for (const f of fs.readdirSync(userDir).filter(x => x.endsWith('.md') && x !== 'README.md').sort()) {
              try {
                const scenario = require('../src/scenario-parser.cjs').parseScenarioMd(fs.readFileSync(path.join(userDir, f), 'utf-8'));
                if (!allScenarios.find(s => s.id === scenario.id)) allScenarios.push(scenario);
              } catch (e) { console.warn(`[hotfix] 用户副本解析失败 ${f}: ${e.message}`); }
            }
          }
          if (currentScenario) {
            const refreshed = findScenarioById(currentScenario.id);
            if (refreshed) currentScenario = refreshed;
          }
          console.log(`[hotfix] Reloaded ${allScenarios.length} scenarios from scenarios_data.json`);
        }
      }
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-choice-history', () => {
    if (!gameState || !gameState.choiceFlags) return [];
    const result = [];
    for (const [scenarioId, choices] of Object.entries(gameState.choiceFlags)) {
      const scenario = findScenarioById(scenarioId);
      if (!scenario) continue;
      const scName = scenario.nameCN || scenario.name || scenarioId;
      for (const [eventId, choiceKey] of Object.entries(choices)) {
        const event = scenario.events.find(e => e.id === eventId);
        if (!event) continue;
        const choiceText = event[choiceKey];
        if (!choiceText) continue;
        const minLevel = event.minLevel || 0;
        // Get target event text (what happened as a result of the choice)
        const targetId = event[choiceKey + 'Target'];
        const targetEvent = targetId ? scenario.events.find(e => e.id === targetId) : null;
        result.push({
          scenarioId,
          eventId,
          eventText: event.text || '',
          choiceText,
          targetText: targetEvent ? targetEvent.text : '',
          minLevel,
          scenarioName: scName,
        });
      }
    }
    return result;
  });

  // ── Hub titles ──
  ipcMain.handle('get-hub-title', () => {
    return getHubTitle(calcLevel(gameState.petTotalExp));
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

  // v4 阶梯成就面板数据（当前档/下一档进度；阶段 8 档案中心使用）
  ipcMain.handle('get-tier-achievements', () => {
    const unlocked = gameState?.unlockedAchievements || [];
    const tiers = TIER_DEFS.map(def => {
      const cur = def.metric();
      const unlockedTiers = (gameState?.tierAchievements || {})[def.key] || 0;
      let nextValue;
      if (def.mode === 'mul') nextValue = def.base * Math.pow(10, unlockedTiers);
      else nextValue = (unlockedTiers + 1) * def.step;
      return {
        key: def.key,
        name: def.name,
        desc: def.desc,
        unlockedTiers,
        current: cur,
        nextValue,
        nextName: `${def.name} ${tierOrdinal(unlockedTiers + 1)}`,
        currentName: unlockedTiers > 0 ? `${def.name} ${tierOrdinal(unlockedTiers)}` : '未解锁',
      };
    });
    const milestones = [
      { id: 'm_first_green', name: '状态全满', desc: '首次三维全绿' },
      { id: 'm_first_choice', name: '选择时刻', desc: '做出首次抉择' },
      { id: 'm_first_completion', name: '初次通关', desc: '首次通关一个世界' },
      { id: 'm_first_title', name: '初戴桂冠', desc: '获得首个称号' },
      { id: 'm_first_hidden', name: '初探秘辛', desc: '首次发现隐藏内容' },
    ].map(m => ({ ...m, unlocked: unlocked.includes(m.id) }));
    return { tiers, milestones };
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
      petLevel: calcLevel(gameState.petTotalExp),
      hubTitle: { name: gameState?.equippedCompletionTitle?.title || getHubTitle(calcLevel(gameState.petTotalExp)).name },
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
      const hubOk = !req.hub_level || calcLevel(gameState.petTotalExp) >= req.hub_level;
      const compOk = !req.completions || completionCount >= req.completions;
      const unlocked = hubOk && compOk;
      return {
        id: s.id,
        unlocked,
        requirement: req,
        petLevel: calcLevel(gameState.petTotalExp),
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
      const dateStr = getLocalDateStr(ts);
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
      const savePath = path.join(getAppDataPath(), getSaveFileName());
      if (fs.existsSync(savePath)) fs.copyFileSync(savePath, path.join(exportDir, getSaveFileName()));

      // 3. Build diagnostic report
      const isInHub = gameState.isInHub;
      const totalExp = gameState.petTotalExp || 0;
      const gameLevel = gameState.level || 1;
      const syncCfg = readSyncConfig();

      // 3a. Sync comparison (if configured)
      let syncInfo = '未配置同步';
      if (syncCfg && syncCfg.path) {
        const cloudSavePath = path.join(syncCfg.path, 'Idel-DreamMaker-Sync', 'save.json');
        if (fs.existsSync(cloudSavePath)) {
          try {
            const cloudData = JSON.parse(fs.readFileSync(cloudSavePath, 'utf-8'));
            const cloudTotal = cloudData.petTotalExp || 0;
            const cloudLevel = calcLevel(cloudData.petTotalExp || 0);
            syncInfo = [
              `同步目录: ${syncCfg.path}`,
              `上次同步: ${syncCfg.lastSync || '未知'}`,
              `设备ID: ${syncCfg.deviceId || '未知'}`,
              `云端玩家: ${cloudData.playerName || '未知'}`,
              `云端宠物等级: ${cloudLevel}`,
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
        `宠物等级: ${gameLevel}`,
        `宠物总经验: ${totalExp}`,
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
      if (typeof targetPath !== 'string' || !targetPath) return { success: false, error: '无效路径' };
      // 只允许打开应用数据/日志/同步/桌面等白名单目录（防渲染层被滥用）
      const allowed = [getAppDataPath(), getLogDir(), require('os').homedir()];
      try { allowed.push(app.getPath('desktop')); } catch {}
      const cfg = readSyncConfig();
      if (cfg && cfg.path) allowed.push(cfg.path);
      const norm = path.normalize(targetPath);
      const ok = allowed.some(base => {
        const nb = path.normalize(base);
        return norm === nb || norm.startsWith(nb + path.sep);
      });
      if (!ok) return { success: false, error: '路径不在允许范围' };
      shell.openPath(targetPath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

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
    gameState.choiceFlags[pe.scenarioId][pe.eventId] = ['choice1', 'choice2', 'choice3', 'choice4'][choiceIndex] || 'choice' + (choiceIndex + 1);
    const scName = (currentScenario?.nameCN || currentScenario?.name || pe.scenarioId);
    appendLogEntry('choice', '【' + scName + ' Lv.' + gameState.level + '】选择了「' + choice.text + '」');
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
    writeSave(gameState);
    return { success: true, choiceFlag: gameState.choiceFlags[pe.scenarioId]?.[pe.eventId] };
  });

  // Catch-up advance（保留：pet-bubble 仍调用此通道）
  // v4：读完待读故事段（点击气泡）→ 标记已读 + 推进下一段（进度攒够则连读）
  ipcMain.handle('story-read', (_, { eventId }) => {
    if (!gameState._pendingStoryEvent || gameState._pendingStoryEvent.id !== eventId) {
      return { success: false, error: '无待读事件' };
    }
    const ev = currentScenario && currentScenario.events.find(e => e.id === eventId);
    if (ev) {
      gameState.triggeredEvents.push(ev.id);
      if (!ev.choice1) applyFlagSet(ev.flagSet);
      // v4 阅读统计（成就阶梯）：隐藏链段单独计
      gameState.petStoriesRead = (gameState.petStoriesRead || 0) + 1;
      if (ev.branch === 'hidden') gameState.petHiddenRead = (gameState.petHiddenRead || 0) + 1;
      // 结局事件（带 CompletionTitle）：分支通关
      if (ev.completionTitle) handleBranchEnding(ev);
      const scName = currentScenario?.name_cn || currentScenario?.nameCN || gameState.scenarioId;
      appendLogEntry('event', '【' + scName + '】' + (ev.text || '').slice(0, 40));
    }
    gameState._pendingStoryEvent = null;
    checkStoryUnlock();   // 立即检查下一段（攒够的进度直接连出）
    writeSave(gameState);
    return { success: true };
  });

  // ── v4 饲养交互：喂食（耗 1 食物，饱食 +10，吃食心情 +1）/ 洗澡（耗 1 肥皂，清洁 +10）/ 抚摸（心情 +4）──
  ipcMain.handle('feed-pet', () => {
    if (!gameState) return { success: false };
    if ((gameState.petFoods || 0) <= 0) {
      sendPetToast(`食物不足（打字 ${V4_CONFIG.feedKeyRate} 击 = 1 个）`);
      return { success: false, error: '食物不足' };
    }
    if (gameState.petFullness >= 100) {
      sendPetToast('已经吃饱了，别撑坏啦');
      return { success: false, error: '已吃饱' };
    }
    gameState.petFoods -= 1;
    gameState.petFullness = clamp100(gameState.petFullness + 10);
    gameState.petMood = clamp100((gameState.petMood || 80) + 1);   // 吃食反馈（台词池阶段 5 接入）
    showPetLine('feed');   // 食物反馈台词
    writeSave(gameState);
    return { success: true, fullness: gameState.petFullness, mood: gameState.petMood, foods: gameState.petFoods };
  });

  ipcMain.handle('wash-pet', () => {
    if (!gameState) return { success: false };
    if ((gameState.petSoaps || 0) <= 0) {
      sendPetToast(`肥皂不足（打字 ${V4_CONFIG.soapKeyRate} 击 = 1 个）`);
      return { success: false, error: '肥皂不足' };
    }
    if (gameState.petCleanliness >= 100) {
      sendPetToast('已经很干净啦');
      return { success: false, error: '已干净' };
    }
    gameState.petSoaps -= 1;
    gameState.petCleanliness = clamp100(gameState.petCleanliness + 10);
    gameState.petMood = clamp100((gameState.petMood || 80) + 1);   // 洗澡反馈（台词池阶段 5 接入）
    showPetLine('wash');   // 洗澡反馈台词
    writeSave(gameState);
    return { success: true, cleanliness: gameState.petCleanliness, mood: gameState.petMood, soaps: gameState.petSoaps };
  });

  ipcMain.handle('pet-pet', () => {
    if (!gameState) return { success: false, error: '无存档' };
    gameState.petMood = clamp100((gameState.petMood || 80) + 4);
    // 宠物语优先级：挂起层（升级/成就/进世界）→ 低维（饿>脏>心情）→ 节日 → 全绿满足 → 日常闲聊
    const pending = gameState._pendingPetLine;
    if (pending) {
      gameState._pendingPetLine = null;
      showPetLine(pending);
    } else if (Date.now() - (gameState._lastPetLineAt || 0) < 30000) {
      // 台词冷却 30 秒：点太频繁只做抚摸动画，不重复弹台词
    } else if ((gameState.petFullness || 0) < 30) {
      showPetLine('hungry');
    } else if ((gameState.petCleanliness || 0) < 30) {
      showPetLine('dirty');
    } else if ((gameState.petMood || 0) < 30) {
      showPetLine('sad');
    } else {
      const hl = pickHolidayLine();
      if (hl) {
        forwardToPet('pet-line', { text: hl });
      } else if ((gameState.petFullness || 0) >= 60 && (gameState.petMood || 0) >= 60 && (gameState.petCleanliness || 0) >= 60) {
        showPetLine('satisfied');
      } else {
        showPetLine('casual');
      }
    }
    writeSave(gameState);
    return { success: true, mood: gameState.petMood };
  });

  // v4 宠物性别（onboarding 三选项 + 右键菜单随时改，即时生效）
  ipcMain.handle('set-pet-gender', (_, { gender }) => {
    if (!gameState) return { success: false, error: '无存档' };
    if (!['male', 'female', 'neutral'].includes(gender)) return { success: false, error: '无效性别' };
    gameState.petGender = gender === 'neutral' ? null : gender;
    writeSave(gameState);
    return { success: true, petGender: gameState.petGender };
  });

  // v4 宠物称谓（默认"主人"，自定义后替换台词占位；限 8 字）
  ipcMain.handle('set-pet-callname', (_, { name }) => {
    if (!gameState) return { success: false, error: '无存档' };
    const clean = String(name || '').trim().slice(0, 8);
    gameState.petCallName = clean;
    writeSave(gameState);
    return { success: true, petCallName: clean };
  });

  // ── v4 更新说明弹窗（首启一次）──
  const CHANGELOG_V4 = {
    version: 'v4.0.1',
    title: '体验优化：经验条修复 + 更省资源',
    points: [
      '修复：世界界面顶部的经验进度条一直停在 0%，现在会正常显示当前经验和百分比',
      '更省资源：宠物窗口的经验条动画改成按需运行，不再常驻空转 CPU',
      '更省资源：挂机时的数据同步改成只在有变化时传输，玩得越久越明显',
      '存档更小更稳：存档文件体积减半；云同步改为限流，不再频繁整目录拷贝',
      '日志不再无限堆积：每个世界最多保留最近 10 次会话记录',
      '游戏内容与 v4.0 一致（废土 + 后室），存档完全兼容，无需重开',
    ],
  };
  ipcMain.handle('get-changelog-info', () => {
    if (!gameState) return { show: false, changelog: CHANGELOG_V4 };
    return { show: gameState.lastSeenChangelogVersion !== CHANGELOG_V4.version, changelog: CHANGELOG_V4 };
  });
  ipcMain.handle('mark-changelog-seen', () => {
    if (!gameState) return { success: false };
    gameState.lastSeenChangelogVersion = CHANGELOG_V4.version;
    writeSave(gameState);
    return { success: true };
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
  ipcMain.handle('get-sync-info', (_, { path: p } = {}) => {
    try {
      if (!p) return { hasCloudSave: false };
      const cloudSavePath = path.join(p, 'Idel-DreamMaker-Sync', 'save.json');
      if (!fs.existsSync(cloudSavePath)) return { hasCloudSave: false };
      const cloudData = JSON.parse(fs.readFileSync(cloudSavePath, 'utf-8'));
      const cloud = {
        playerName: cloudData.playerName || '?',
        petTotalExp: cloudData.petTotalExp || 0,
        lastWriteTimestamp: cloudData.lastWriteTimestamp || '',
        petLevel: calcLevel(cloudData.petTotalExp || 0),
      };
      const local = {
        playerName: gameState?.playerName || '?',
        petTotalExp: gameState?.petTotalExp || 0,
        lastWriteTimestamp: gameState?.lastWriteTimestamp || '',
        petLevel: calcLevel(gameState?.petTotalExp || 0),
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
  ipcMain.handle('confirm-sync-directory', (_, { path: syncDir, action }) => {
    try {
      writeSyncConfig({ path: syncDir, deviceId: require('os').hostname(), lastSync: new Date().toISOString() });
      if (action === 'import') {
        const cloudSavePath = path.join(syncDir, 'Idel-DreamMaker-Sync', 'save.json');
        if (fs.existsSync(cloudSavePath)) {
          const imported = JSON.parse(fs.readFileSync(cloudSavePath, 'utf-8'));
          Object.assign(gameState, imported);
          gameState._version = SAVE_VERSION;
          gameState.lastWriteTimestamp = new Date().toISOString();
          normalizeGameState(gameState);
          // Rebuild scenario state
          gameState.level = calcLevel(gameState.petTotalExp);
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
          const localTotal = gameState?.petTotalExp || 0;
          const cloudTotal = cloudData.petTotalExp || 0;
          if (cloudTime > localTime && cloudTotal >= localTotal) {
            Object.assign(gameState, cloudData);
            gameState._version = SAVE_VERSION;
            gameState.lastWriteTimestamp = new Date().toISOString();
            normalizeGameState(gameState);
            gameState.level = calcLevel(gameState.petTotalExp);
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
          petLevel: calcLevel(gameState.petTotalExp),
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
      const sp = path.join(getAppDataPath(), getSaveFileName());
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
        level: 1, exp: 0, petTotalExp: 0, totalRuntimeMs: 0,
        equippedTitleIndex: 0, isInHub: true,
        language: 'zh', aiOutputLanguage: 'zh', selectedFontTheme: 'green',
        scenarioAlias: '', unlockedTitleSets: {}, scenarioProgress: {},
        triggeredEvents: [], unlockedAchievements: [],
        petSelectedIndex: 0, hasSeenOnboarding: false,
        lastLoginDay: '', hubEquippedTitles: {},
        dailyBonus: false,
        currentBranch: '', branchProgress: {}, flags: {},
        gameCompletions: [], unlockedCompletionTitles: [], equippedCompletionTitle: null,
        archivedScenarios: [], promptDismissedAtScenarioCount: null,
        totalKeyPresses: 0, dailyKeyPresses: 0,
        keyPressDate: getLocalDateStr(), comboMilestones: [], highestStreak: 0,
        choiceFlags: {}, pendingChoiceEvent: null, lastWriteTimestamp: new Date().toISOString(),
      };
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
            // semver 比较：'3.10.0' > '3.9.5'（纯字符串比较会误判）
            const verParts = v => v.split('.').map(n => parseInt(n, 10) || 0);
            const lp = verParts(latest), cp = verParts(current);
            let hasUpdate = false;
            for (let i = 0; i < 3; i++) {
              if ((lp[i] || 0) > (cp[i] || 0)) { hasUpdate = true; break; }
              if ((lp[i] || 0) < (cp[i] || 0)) break;
            }
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
    try {
      // 只允许打开 https 下载链接（镜像域名列表），防渲染层被滥用
      const ALLOWED_DL_HOSTS = ['github.com', 'gh-proxy.com', 'ghproxy.com', 'ghfast.top', 'gh-proxy.net', 'ghproxy.net', 'mirror.ghproxy.com', 'download.fastgit.org', 'github.moeyy.xyz', 'github.pgp.dev'];
      if (typeof url !== 'string' || !/^https:\/\//.test(url)) return { success: false };
      const host = (url.split('/')[2] || '').toLowerCase();
      if (!ALLOWED_DL_HOSTS.some(h => host === h || host.endsWith('.' + h))) return { success: false };
      shell.openExternal(url);
      return { success: true };
    } catch { return { success: false }; }
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

  // v4.1：启动时清理超量日志（每副本保留最近 10 个会话）
  pruneLogs();

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
    // v4 主辅反转：重复启动 → 显示宠物窗口（主界面）
    try { showPetWindow(); } catch {}
    if (mainWindow && mainWindow.isMinimized()) mainWindow.restore();
  });

  allScenarios = loadScenarios();
  const userScenarios = loadUserScenarios();
  if (userScenarios.length > 0) {
    allScenarios.push(...userScenarios);
    console.log(`Loaded ${userScenarios.length} user scenario(s)`);
  }

  // Load save or create default
  gameState = readSave();
  if (gameState) normalizeGameState(gameState);   // 修复：读档后补 normalize（否则 petFoods 等 undefined，攒道具触发判断恒 false）
  if (!gameState) {
    const defaultScenario = allScenarios[0];
    gameState = {
      playerName: 'Worker',
      scenarioId: defaultScenario ? defaultScenario.id : '',
      level: 1,
      exp: 0,
      petTotalExp: 0,
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
      currentBranch: '',
      branchProgress: {},
      flags: {},
      gameCompletions: [],
      unlockedCompletionTitles: [],
      equippedCompletionTitle: null,
      archivedScenarios: [],
      promptDismissedAtScenarioCount: null,
      totalKeyPresses: 0,
      dailyKeyPresses: 0,
      keyPressDate: getLocalDateStr(),
      comboMilestones: [], highestStreak: 0,
      choiceFlags: {},
      pendingChoiceEvent: null,
      lastWriteTimestamp: new Date().toISOString(),
    };
  }

  // Ensure new fields exist
  if (!gameState.currentBranch) gameState.currentBranch = '';
  if (!gameState.branchProgress) gameState.branchProgress = {};
  // Migrate legacy completedBranches array (v3.7.8-) into per-scenario structure
  if (Array.isArray(gameState.completedBranches)) {
    const legacyBranchMap = { scavenger: 'survivor', soldier: 'fugitive' };
    const sid = gameState.scenarioId || 'backrooms';
    if (!gameState.branchProgress[sid]) gameState.branchProgress[sid] = [];
    for (const b of gameState.completedBranches) {
      const mapped = legacyBranchMap[b] || b;
      if (mapped && !gameState.branchProgress[sid].includes(mapped)) gameState.branchProgress[sid].push(mapped);
    }
    delete gameState.completedBranches;
  }
  if (!gameState.flags) gameState.flags = {};

  // ── v4 大清理（一次性）：数值保留，故事数据全清（设计文档 §14）──
  if (!gameState._v4CleanupDone) {
    gameState.triggeredEvents = [];
    gameState.branchProgress = {};
    gameState.flags = {};
    gameState.choiceFlags = {};
    gameState.scenarioProgress = {};
    gameState.gameCompletions = [];
    gameState.currentBranch = '';
    gameState.pendingChoiceEvent = null;
    gameState._catchUpQueue = null;
    // v4.0：旧存档只有一个世界（废土）——把累计陪伴时长归到它名下，免得世界卡片显示 0
    if ((gameState.totalRuntimeMs || 0) > 0) {
      const legacySid = (gameState.scenarioId && findScenarioById(gameState.scenarioId)) ? gameState.scenarioId : 'wasteland';
      gameState.scenarioProgress[legacySid] = { ...(gameState.scenarioProgress[legacySid] || {}), totalRuntimeMs: gameState.totalRuntimeMs };
    }
    gameState._v4CleanupDone = true;
    // 旧日志清理
    try {
      const logDir = getLogDir();
      if (fs.existsSync(logDir)) fs.rmSync(logDir, { recursive: true, force: true });
    } catch (e) { console.error('[migration] v4 日志清理失败:', e.message); }
    console.log('[migration] v4 大清理完成：故事数据与旧日志已清空，等级/成就/统计保留');
  }

  // Set current scenario
  if (gameState.scenarioId && !gameState.isInHub) {
    currentScenario = findScenarioById(gameState.scenarioId);
    if (currentScenario) {
      currentTitle = getCurrentTitle(currentScenario, gameState.level);
      setLogSession(gameState.scenarioId);
    } else {
      // 存档里记的世界已不存在（副本被删除/改名/换格式）→ 视为回到大厅。
      // 否则会卡在一个"空世界"：经验不涨、剧情不出、只能自己摸回大厅。
      console.log('[migration] 存档里的世界不存在，已回到大厅:', gameState.scenarioId);
      gameState.scenarioId = '';
      gameState.isInHub = true;
      gameState._pendingStoryEvent = null;
      gameState.pendingChoiceEvent = null;
      currentScenario = null;
      currentTitle = null;
    }
  } else {
    currentScenario = null;
    currentTitle = null;
  }

  // Migrate: auto-acknowledge new events with minLevel below current level
  // Only acknowledges events belonging to the current branch, preventing
  // cross-branch events from contaminating the player's triggered list.
  if (currentScenario && gameState && !gameState.isInHub && gameState.level > 1) {
    const cb = gameState.currentBranch || '';
    const oldLen = gameState.triggeredEvents.length;
    // choice target 不迁移（只能由选择触发，否则后续选择会被跳过且 flag 不应用）
    const allTargetIds = new Set();
    for (const e of currentScenario.events) {
      if (e.choice1Target) allTargetIds.add(e.choice1Target);
      if (e.choice2Target) allTargetIds.add(e.choice2Target);
      if (e.choice3Target) allTargetIds.add(e.choice3Target);
      if (e.choice4Target) allTargetIds.add(e.choice4Target);
    }
    // Add new events that belong to this branch
    const toAdd = currentScenario.events.filter(e =>
      e.once && !gameState.triggeredEvents.includes(e.id) &&
      !allTargetIds.has(e.id) &&
      e.minLevel && e.minLevel < gameState.level &&
      (!e.branch || e.branch === '' || e.branch === cb)
    );
    if (toAdd.length > 0) {
      for (const ev of toAdd) gameState.triggeredEvents.push(ev.id);
      console.log(`[migration] auto-acknowledged ${toAdd.length} new events below Lv.${gameState.level}`);
    }
    // v4.1：跨分支清理 + 成就自检改成一次性迁移（原来每次启动都跑）。
    // 它会把"不属于当前分支"的已读记录删掉，紧接着的成就自检又据此撤销已解锁的事件类
    // 成就——换了分支后重启（本机每天 05:30 自动重启）就掉进度，违反设计文档 §8.1
    // "已解锁永不收回"。清理本身只对老存档的脏数据有意义，跑一次就够。
    if (!gameState._branchCleanupDone) {
      const cleaned = gameState.triggeredEvents.filter(id => {
        if (id.startsWith('ms_') || id.startsWith('holiday_') || id.startsWith('scenario_ending_')) return true;
        const ev = currentScenario.events.find(e => e.id === id);
        if (!ev) return true;
        if (ev.branch && ev.branch !== '' && ev.branch !== cb) return false;
        return true;
      });
      if (cleaned.length < gameState.triggeredEvents.length) {
        gameState.triggeredEvents = cleaned;
        console.log(`[migration] cleaned ${oldLen - cleaned.length} cross-branch events from triggered list`);
      }
      // 成就自检：v4.1 起只补不删——已解锁的成就永不收回（条件不再满足也不动它）。
      // 计数类成就的判定已改走高水位（petEventsPeak），不会因清理而掉档。
      // 仅保留日志清理：删掉对不上当前状态的历史条目（世界档案的故事阅读史）。
      cleanupLogFiles(currentScenario, gameState);
      gameState._branchCleanupDone = true;
      console.log('[migration] 跨分支清理与成就自检完成（一次性，不再每次启动运行）');
    }
  }

  // Hub totalExp 0.5x conversion for v3.7.5
  if (gameState.hubTotalExp > 0 && !gameState._hubExpMigrated) {
    gameState.hubTotalExp = Math.floor(gameState.hubTotalExp * 0.5);
    gameState._hubExpMigrated = true;
  }

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
        const dateKey = f.replace('.json', '');
        try {
          const content = fs.readFileSync(path.join(logDir, f), 'utf-8').trim();
          if (!content) continue;
          const writeEntry = (e) => {
            const t = e.t && e.t.length < 10 ? `${dateKey} ${e.t}` : (e.t || '');
            fs.appendFileSync(legacyPath, JSON.stringify({ t, ty: e.ty || 'event', m: e.m || '' }) + '\n', 'utf-8');
          };
          if (content.startsWith('[')) {
            const entries = JSON.parse(content);
            for (const e of entries) writeEntry(e);
          } else {
            for (const line of content.split('\n')) {
              try { const e = JSON.parse(line); writeEntry(e); } catch {}
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

  // Recovery: fix date-less entries in existing .log files
  if (fs.existsSync(logDir)) {
    for (const f of fs.readdirSync(logDir).filter(f => f.endsWith('.log'))) {
      const filePath = path.join(logDir, f);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        let needsRewrite = false;
        const lines = content.split('\n').filter(l => l.trim());
        let fileDateKey = null;
        const legacyMatch = f.match(/^_legacy_(\d{4})(\d{2})(\d{2})_/);
        if (legacyMatch) {
          fileDateKey = `${legacyMatch[1]}-${legacyMatch[2]}-${legacyMatch[3]}`;
        } else {
          try {
            const st = fs.statSync(filePath);
            const d = st.mtime;
            fileDateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          } catch {}
        }
        const fixedLines = [];
        for (const line of lines) {
          try {
            const e = JSON.parse(line);
            if (e.ty === 'system' || e.ty === 'info' || e.ty === 'error') { needsRewrite = true; continue; }
            if (e.t && e.t.length < 10 && fileDateKey) {
              e.t = `${fileDateKey} ${e.t}`;
              needsRewrite = true;
            }
            fixedLines.push(JSON.stringify(e));
          } catch { fixedLines.push(line); }
        }
        if (needsRewrite) {
          fs.writeFileSync(filePath, fixedLines.join('\n') + '\n', 'utf-8');
        }
      } catch {}
    }
  }

  setupAppMenu();
  createWindow();

  // Restore window position from save
  if (gameState.windowX !== undefined && gameState.windowY !== undefined) {
    mainWindow.setPosition(gameState.windowX, gameState.windowY);
  }

  // Save window position on move（静默写盘，不触发云同步）
  let moveTimer = null;
  mainWindow.on('move', () => {
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      if (gameState && mainWindow) {
        const [x, y] = mainWindow.getPosition();
        gameState.windowX = x;
        gameState.windowY = y;
        writeSave(gameState, true);
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

  // Trigger initial story for restored scenarios (first entry only)
  // v4：进入世界时检查时间解锁（storySeconds 够则挂出待读/弹抉择）
  if (!gameState.isInHub && currentScenario && !gameState.scenarioProgress?.[gameState.scenarioId]) {
    gameState._pendingStoryEvent = null;
    checkStoryUnlock();
  }

  startGameLoop();
  initInputListener();
  setupAutoUpdater();
  autoUpdater.checkForUpdates().catch(() => {});

  // DEV mode: poll .reload_flag for test-utils hotfix notifications
  if (IS_DEV) {
    const reloadFlagPath = path.join(getAppDataPath(), '.reload_flag');
    let lastSeq = 0;
    const reloadTimer = setInterval(() => {
      try {
        if (!fs.existsSync(reloadFlagPath)) return;
        const content = fs.readFileSync(reloadFlagPath, 'utf-8').trim();
        if (!content) { fs.unlinkSync(reloadFlagPath); return; }
        const data = JSON.parse(content);
        if (data.seq && data.seq > lastSeq) {
          lastSeq = data.seq;
          // Reload scenario data
          const dataPath = path.join(__dirname, '..', 'public', 'scenarios_data.json');
          if (fs.existsSync(dataPath)) {
            const loaded = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (loaded && loaded.length > 0) {
              allScenarios = loaded;
              if (currentScenario) {
                const refreshed = findScenarioById(currentScenario.id);
                if (refreshed) currentScenario = refreshed;
              }
              console.log('[reload] Hotfix applied, scenarios reloaded (seq=' + data.seq + ')');
            }
          }
          // Re-read dev save
          if (!gameState.isInHub && currentScenario) {
            const sp = path.join(getAppDataPath(), getSaveFileName());
            if (fs.existsSync(sp)) {
              const newState = JSON.parse(fs.readFileSync(sp, 'utf-8'));
              Object.assign(gameState, newState);
              gameState._version = SAVE_VERSION;
            }
          }
          fs.unlinkSync(reloadFlagPath);
        } else if (data.seq <= lastSeq) {
          // Old notification, clean up
          fs.unlinkSync(reloadFlagPath);
        }
      } catch {}
    }, 2000);
    app.on('before-quit', () => {
      clearInterval(reloadTimer);
      try { if (fs.existsSync(reloadFlagPath)) fs.unlinkSync(reloadFlagPath); } catch {}
    });
  }

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
    const lv = `宠物 Lv.${calcLevel(gameState.petTotalExp)}`;
    const sc = currentScenario ? (currentScenario.name_cn || currentScenario.nameCN || currentScenario.name) : (gameState.isInHub ? '大厅' : '?');
    setToolTip(`${gameState.playerName} | ${sc}\n${lv} | ${title} | ${rtStr}`);
  }, 5000);

  // v4 主辅反转：启动只显示宠物窗口（主窗口=控制面板，双击宠物/托盘/右键打开）
  try { showPetWindow(); } catch (e) { console.error('show pet window failed:', e); }
  if (mainWindow) mainWindow.hide();

  // 截图模式：SCREENSHOT_MODE=场景数 → 自动截帧 PNG 序列（readme gif 用，ffmpeg 转 gif）
  if (process.env.SCREENSHOT_MODE) {
    runScreenshotMode(parseInt(process.env.SCREENSHOT_MODE, 10) || 3);
  }
});

// ── 截图模式（readme gif 生成，不参与正常流程）──
const SHOT_DIR = path.join(__dirname, '..', 'shots_tmp');
async function runScreenshotMode(scenes) {
  try {
    await waitForLoad(getPetWindow(), 15000);
    await waitForLoad(mainWindow, 15000);
    mainWindow.show();               // 截图需要主窗口可见
    mainWindow.focus();
    await sleep(1500);
    const shots = [];
    console.log('[shot] scene1 pet window');
    // 场景 1：宠物窗口（模拟悬停显示完整 UI，静帧）
    if (scenes >= 1) {
      const pw = getPetWindow();
      if (pw) {
        pw.show();
        await sleep(800);
        try { pw.webContents.sendInputEvent({ type: 'mouseMove', x: 96, y: 160 }); } catch (e) { console.log('[shot] hover fail:', e.message); }
        await sleep(600);
        try {
          const diag = await pw.webContents.executeJavaScript(`JSON.stringify({ expFillW: document.getElementById('exp-fill').style.width, expFillOW: document.getElementById('exp-fill').offsetWidth, expTrackOW: document.getElementById('exp-fill').parentElement.offsetWidth, expDetail: document.getElementById('exp-detail').textContent, expWrapDisp: getComputedStyle(document.getElementById('exp-wrap')).display, expRowDisp: getComputedStyle(document.getElementById('exp-row')).display, expRowOW: document.getElementById('exp-row').offsetWidth })`);
          console.log('[shot] exp diag:', diag);
        } catch (e) { console.log('[shot] exp diag failed:', e.message); }
        const img = await cap(pw);
        if (img) shots.push(img);
      }
    }
    console.log('[shot] scene2 world select');
    // 场景 2：世界选择面板（静帧）；先关闭更新弹窗
    if (scenes >= 2) {
      mainWindow.show();
      mainWindow.focus();
      await sleep(1500);
      try {
        await mainWindow.webContents.executeJavaScript(`document.getElementById('changelog-ok').click()`);
        await sleep(500);
      } catch (e) { console.log('[shot] changelog close failed (may not be open):', e.message); }
      try {
        await mainWindow.webContents.executeJavaScript(`document.getElementById('btn-scenario').click()`);
        await sleep(700);
      } catch (e) { console.log('[shot] scenario panel open failed:', e.message); }
      const img = await cap(mainWindow);
      if (img) shots.push(img);
    }
    console.log('[shot] scene3 archive');
    // 场景 3：档案中心（静帧）
    if (scenes >= 3) {
      try {
        await mainWindow.webContents.executeJavaScript(`document.getElementById('journey-menu').classList.remove('hidden');`);
        await sleep(300);
        await mainWindow.webContents.executeJavaScript(`document.querySelector('[data-action="archive-pet"]').click();`);
      } catch (e) { console.log('[shot] archive panel open failed:', e.message); }
      await sleep(700);
      const img = await cap(mainWindow);
      if (img) shots.push(img);
    }
    console.log('[shot] saving frames');
    // 保存 PNG 序列
    for (let i = 0; i < shots.length; i++) {
      const p = path.join(SHOT_DIR, `shot_${String(i + 1).padStart(2, '0')}.png`);
      fs.writeFileSync(p, shots[i].toPNG());
    }
    console.log(`[shot] saved ${shots.length} frames to ${SHOT_DIR}`);
    app.exit(0);
  } catch (e) {
    console.error('[shot] failed:', e);
    app.exit(1);
  }
}
function waitForLoad(win, timeout) {
  return new Promise((resolve, reject) => {
    if (!win) return reject(new Error('no window'));
    const t = setTimeout(() => reject(new Error('load timeout')), timeout);
    if (!win.webContents.isLoading()) { clearTimeout(t); return resolve(); }
    win.webContents.once('did-finish-load', () => { clearTimeout(t); resolve(); });
  });
}
// capturePage 封装：5 秒超时防挂起；stayHidden 截隐藏窗口
function cap(win) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; console.log('[shot] capture timeout, skip frame'); resolve(null); } }, 5000);
    win.webContents.capturePage({ stayHidden: true }).then(img => { if (!done) { done = true; clearTimeout(t); resolve(img); } }).catch(() => { if (!done) { done = true; clearTimeout(t); resolve(null); } });
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
