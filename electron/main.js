const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 840,
    minWidth: 280,
    minHeight: 400,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:1420');
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'src-tauri', 'icons', '32x32.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Idel-DreamMaker');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function getAppDataPath() {
  const base = app.getPath('appData');
  return path.join(base, 'Idel-DreamMaker');
}

// ── IPC Handlers ──

function readSave() {
  try {
    const sp = path.join(getAppDataPath(), 'save.json');
    if (!fs.existsSync(sp)) return null;
    return JSON.parse(fs.readFileSync(sp, 'utf-8'));
  } catch { return null; }
}

function writeSave(data) {
  try {
    const dir = getAppDataPath();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'save.json'), JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) { console.error('Save failed:', e); }
}

// Read scenarios data
function loadScenarios() {
  try {
    const jsonPath = app.isPackaged
      ? path.join(process.resourcesPath, 'scenarios_data.json')
      : path.join(__dirname, '..', 'public', 'scenarios_data.json');
    return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (e) {
    console.error('Failed to load scenarios:', e);
    return [];
  }
}

let allScenarios = [];
let gameState = null;
let currentScenario = null;
let currentTitle = null;
let hubLevel = 1;
let gameLoopInterval = null;
let tooltipInterval = null;

// ── Game Logic ──

function calcLevel(exp) {
  return exp <= 0 ? 1 : Math.floor(Math.sqrt(exp / 100)) + 1;
}

function calcExpForLevel(level) {
  if (level <= 1) return 0;
  return 100 * (level - 1) * (level - 1);
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
  gameState.level = 1;
  gameState.exp = 0;
  gameState.totalExpEarned = 0;
  gameState.totalRuntimeMs = 0;
  gameState.triggeredEvents = [];
  gameState.unlockedAchievements = [];
  gameState.equippedTitleIndex = 0;
  gameState.isInHub = false;
  gameState.scenarioAlias = alias || '';
  currentScenario = scenario;
}

function exitToHub() {
  const unlocked = getUnlockedTitles(currentScenario, gameState.level).map(t => t.name);
  const sid = gameState.scenarioId;
  if (sid) {
    if (!gameState.unlockedTitleSets) gameState.unlockedTitleSets = {};
    gameState.unlockedTitleSets[sid] = unlocked;
  }

  gameState.hubTotalExp += gameState.totalExpEarned;

  gameState.scenarioId = '';
  gameState.level = 1;
  gameState.exp = 0;
  gameState.totalExpEarned = 0;
  gameState.totalRuntimeMs = 0;
  gameState.triggeredEvents = [];
  gameState.unlockedAchievements = [];
  gameState.isInHub = true;
  hubLevel = calcLevel(gameState.hubTotalExp);
}

function checkAndTriggerEvent() {
  if (!currentScenario || !currentScenario.events || gameState.isInHub) return;

  const runtimeHours = gameState.totalRuntimeMs / 3600000;
  let prob;
  if (runtimeHours < 12) prob = 0.4;
  else if (runtimeHours < 72) prob = 0.3;
  else prob = 0.15;

  if (Math.random() < prob) {
    const pool = currentScenario.events.filter(e => {
      if (e.minLevel && e.minLevel > gameState.level) return false;
      if (e.minHours && e.minHours > runtimeHours) return false;
      if (e.once && gameState.triggeredEvents.includes(e.id)) return false;
      return true;
    });

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

function checkAchievements() {
  if (!currentScenario || !currentScenario.achievements || gameState.isInHub) return [];

  const unlocked = [];
  for (const a of currentScenario.achievements) {
    if (gameState.unlockedAchievements.includes(a.id)) continue;
    let met = false;
    switch (a.condition.type) {
      case 'level':
        met = gameState.level >= a.condition.value;
        break;
      case 'runtime':
        met = gameState.totalRuntimeMs >= a.condition.value * 3600000;
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

function startGameLoop() {
  if (gameLoopInterval) return;
  let lastTick = Date.now();

  gameLoopInterval = setInterval(() => {
    if (!gameState || gameState.isInHub) return;

    const now = Date.now();
    const delta = now - lastTick;
    lastTick = now;

    gameState.totalRuntimeMs += delta;
    const expGain = delta / 1000;
    gameState.exp += expGain;
    gameState.totalExpEarned += expGain;

    // Level up check
    const oldLevel = gameState.level;
    gameState.level = calcLevel(gameState.totalExpEarned);
    if (gameState.level > oldLevel) {
      const title = getCurrentTitle(currentScenario, gameState.level);
      if (title) {
        currentTitle = title;
        gameState.equippedTitleIndex = currentScenario.titles.indexOf(title);
        try { mainWindow.webContents.send('level-up', { level: gameState.level, title: title.name, titleColor: title.color, titleDesc: title.desc }); } catch {}
      } else {
        try { mainWindow.webContents.send('level-up', { level: gameState.level, title: null, titleColor: null, titleDesc: null }); } catch {}
      }
    }

    // Event check (every ~60s)
    if (Math.random() < delta / 60000) {
      const event = checkAndTriggerEvent();
      if (event) {
        try { mainWindow.webContents.send('event-triggered', { id: event.id, title: event.title || '事件', color: event.color || '#FFA500', text: event.text }); } catch {}
      }
    }

    // Achievement check
    const newAchievements = checkAchievements();
    for (const a of newAchievements) {
      try { mainWindow.webContents.send('achievement-unlocked', { id: a.id, name: a.name, desc: a.desc, icon: a.icon || '★' }); } catch {}
    }

    // Send game tick
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
    };
    try { mainWindow.webContents.send('game-tick', payload); } catch {}

    // Auto-save every 30s
    if (gameState.totalRuntimeMs % 30000 < delta) {
      writeSave(gameState);
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
        scenario_alias: gameState.scenarioAlias || '',
        unlocked_title_sets: gameState.unlockedTitleSets || {},
        scenario_progress: gameState.scenarioProgress || {},
        triggered_events: gameState.triggeredEvents || [],
        unlockedAchievements: gameState.unlockedAchievements || [],
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
    }));
  });

  ipcMain.handle('set-player-name', (_, { name }) => {
    gameState.playerName = name;
    return true;
  });

  ipcMain.handle('select-scenario', (_, { id, alias }) => {
    const scenario = findScenarioById(id);
    if (!scenario) throw new Error(`Scenario '${id}' not found`);
    const aliasStr = alias || '';
    resetGameForScenario(scenario, aliasStr);
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
        scenario_alias: gameState.scenarioAlias || '',
        unlocked_title_sets: gameState.unlockedTitleSets || {},
        scenario_progress: gameState.scenarioProgress || {},
        triggered_events: gameState.triggeredEvents || [],
        unlockedAchievements: gameState.unlockedAchievements || [],
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
        scenario_alias: gameState.scenarioAlias || '',
        unlocked_title_sets: gameState.unlockedTitleSets || {},
        scenario_progress: gameState.scenarioProgress || {},
        triggered_events: gameState.triggeredEvents || [],
        unlockedAchievements: gameState.unlockedAchievements || [],
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

  ipcMain.handle('draw-scenario', () => {
    if (allScenarios.length === 0) return null;
    const idx = Math.floor(Math.random() * allScenarios.length);
    const s = allScenarios[idx];
    return {
      id: s.id,
      name: s.name,
      nameCN: s.name_cn || s.nameCN,
      description: s.description,
      playerTitle: s.playerTitle || s.player_title,
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
      };
    });
  });

  ipcMain.handle('set-title', (_, { index }) => {
    if (!currentScenario || !currentScenario.titles || index >= currentScenario.titles.length) {
      throw new Error('Title index out of bounds');
    }
    gameState.equippedTitleIndex = index;
    currentTitle = currentScenario.titles[index];
    return true;
  });

  ipcMain.handle('set-language', (_, { lang }) => {
    gameState.language = lang;
    return true;
  });

  ipcMain.handle('set-ai-output-language', (_, { lang }) => {
    gameState.aiOutputLanguage = lang;
    return true;
  });

  ipcMain.handle('set-font-theme', (_, { theme }) => {
    gameState.selectedFontTheme = theme;
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
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setSize(250, 80);
    } else if (mode === 'full') {
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
    if (tray) tray.setToolTip(text);
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
}

// ── App Lifecycle ──

app.whenReady().then(() => {
  allScenarios = loadScenarios();

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

  createWindow();
  createTray();
  registerIpcHandlers();
  startGameLoop();

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
    tray.setToolTip(`${gameState.playerName} | ${sc}\n${lv} | ${title} | ${rtStr}`);
  }, 5000);
});

app.on('before-quit', () => {
  isQuitting = true;
  stopGameLoop();
  if (tooltipInterval) clearInterval(tooltipInterval);
  if (gameState) writeSave(gameState);
});

app.on('window-all-closed', () => {
  // Don't quit on window close (tray-based app)
});
