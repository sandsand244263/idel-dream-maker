const { BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const { registerSelectorIpcHandlers } = require('./pet-selector.cjs');
const { registerBubbleIpcHandlers } = require('./pet-bubble.cjs');

let petWindow = null;
let currentPetList = [];
let selectedPetIndex = 0;

function getAppDir(app) {
  return path.join(app.getPath('appData'), 'Idel-DreamMaker');
}

function getPetsDir(app) {
  return path.join(getAppDir(app), 'pets');
}

function getPetPos(app) {
  try {
    const p = path.join(getAppDir(app), 'pet_position.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch { return null; }
}

function savePetPos(x, y, app) {
  try {
    const dir = getAppDir(app);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'pet_position.json'), JSON.stringify({ x, y }), 'utf-8');
  } catch {}
}

function scanPets(app) {
  const dir = getPetsDir(app);
  currentPetList = [];
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      return currentPetList;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const petDir = path.join(dir, entry.name);
      const spritesheet = findSpritesheet(petDir);
      if (!spritesheet) continue;
      let petName = entry.name;
      let petAuthor = '';
      let petConfig = null;
      const metaPath = path.join(petDir, 'pet.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          if (meta.displayName) petName = meta.displayName;
          else if (meta.name) petName = meta.name;
          if (meta.author) petAuthor = meta.author;
          if (meta.states || meta.animations) petConfig = meta.states || meta.animations;
        } catch {}
      }
      currentPetList.push({
        slug: entry.name,
        name: petName,
        author: petAuthor,
        spritesheet: spritesheet,
        config: petConfig,
      });
    }
  } catch (e) {
    console.error('scanPets error:', e);
  }
  return currentPetList;
}

function findSpritesheet(dir) {
  for (const ext of ['.png', '.webp']) {
    for (const file of ['spritesheet' + ext, 'sprite' + ext, 'sheet' + ext]) {
      const p = path.join(dir, file);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function sendToPet(channel, data) {
  if (petWindow && !petWindow.isDestroyed()) {
    try { petWindow.webContents.send(channel, data); } catch {}
  }
}

function createPetWindow(app) {
  if (petWindow && !petWindow.isDestroyed()) return petWindow;

  petWindow = new BrowserWindow({
    width: 192,
    height: 210,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: true,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'pet-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      enablePreferredSizeMode: true,
    },
  });

  petWindow.loadFile(path.join(__dirname, '..', 'pet', 'index.html'));

  // Auto-resize to content (preferred-size-changed = Chromium built-in)
  petWindow.webContents.on('preferred-size-changed', (_, { width, height }) => {
    if (!petWindow || petWindow.isDestroyed()) return;
    petWindow.setContentSize(width, Math.min(Math.max(height + 4, 200), 500));
  });
  // Prevent manual resize while allowing programmatic setContentSize
  petWindow.setMinimumSize(192, 200);
  petWindow.setMaximumSize(192, 500);

  // Restore position
  const pos = getPetPos(app);
  if (pos && typeof pos.x === 'number') {
    petWindow.setPosition(pos.x, pos.y);
  }

  petWindow.on('closed', () => { petWindow = null; });
  return petWindow;
}

function registerPetIpcHandlers(mainWindow, app) {
  ipcMain.handle('hide-pet-window', () => {
    if (petWindow && !petWindow.isDestroyed()) petWindow.hide();
    return true;
  });

  ipcMain.handle('toggle-pet-window', () => {
    if (petWindow && !petWindow.isDestroyed()) {
      if (petWindow.isVisible()) { petWindow.hide(); }
      else { petWindow.show(); petWindow.focus(); }
    }
    return true;
  });

  ipcMain.handle('toggle-main-window', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) { mainWindow.hide(); }
      else { mainWindow.show(); mainWindow.focus(); forwardToPet('main-shown', {}); }
    }
    return true;
  });

  ipcMain.handle('scan-pets', () => {
    scanPets(app);
    return { pets: currentPetList, selected: selectedPetIndex };
  });

  ipcMain.handle('select-pet', (_, { index }) => {
    if (index >= 0 && index < currentPetList.length) {
      selectedPetIndex = index;
      sendToPet('pet-selected', { index, pet: currentPetList[index] });
    }
    return true;
  });

  ipcMain.handle('pet-get-state', () => {
    return { hasData: !!mainWindow };
  });

  ipcMain.handle('pet-drag-start', () => {
    return true;
  });

  ipcMain.handle('pet-drag-move', (_, { x, y }) => {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.setPosition(x, y);
      savePetPos(x, y, app);
    }
    return true;
  });

  ipcMain.handle('pet-drag-end', () => {
    if (petWindow) petWindow._dragOffset = null;
    return true;
  });

  ipcMain.handle('get-pet-spritesheet', (_, { index }) => {
    if (index >= 0 && index < currentPetList.length) {
      const pet = currentPetList[index];
      try {
        const data = fs.readFileSync(pet.spritesheet);
        return { data: data.toString('base64'), ext: path.extname(pet.spritesheet), config: pet.config || null };
      } catch {}
    }
    return null;
  });

  ipcMain.handle('open-pets-folder', () => {
    const dir = getPetsDir(require('electron').app);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    shell.openPath(dir);
    return true;
  });

  registerSelectorIpcHandlers(app);
  registerBubbleIpcHandlers(app);
}

function forwardToPet(channel, payload) {
  sendToPet(channel, payload);
}

function showPetWindow() {
  if (petWindow && !petWindow.isDestroyed()) petWindow.show();
}

function togglePetWindow() {
  if (petWindow && !petWindow.isDestroyed()) {
    if (petWindow.isVisible()) { petWindow.hide(); }
    else { petWindow.show(); petWindow.focus(); }
  }
}

function initPet(app) {
  scanPets(app);
  const win = createPetWindow(app);
  sendToPet('pet-list', { pets: currentPetList, selected: selectedPetIndex });
  return win;
}

module.exports = { scanPets, registerPetIpcHandlers, forwardToPet, showPetWindow, togglePetWindow, initPet };
