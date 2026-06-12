const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let petWindow = null;
let currentPetList = [];
let selectedPetIndex = 0;

function getPetsDir(app) {
  const base = app.getPath('appData');
  return path.join(base, 'Idel-DreamMaker', 'pets');
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
      const metaPath = path.join(petDir, 'pet.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          if (meta.name) petName = meta.name;
          if (meta.author) petAuthor = meta.author;
        } catch {}
      }
      currentPetList.push({
        slug: entry.name,
        name: petName,
        author: petAuthor,
        spritesheet: spritesheet,
      });
    }
  } catch (e) {
    console.error('scanPets error:', e);
  }
  return currentPetList;
}

function findSpritesheet(dir) {
  // Try .png first, then .webp
  for (const ext of ['.png', '.webp']) {
    for (const file of ['spritesheet' + ext, 'sprite' + ext, 'sheet' + ext]) {
      const p = path.join(dir, file);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function getPetList() {
  return currentPetList;
}

function createPetWindow(mainWindow, app) {
  if (petWindow) {
    petWindow.show();
    petWindow.focus();
    return petWindow;
  }

  petWindow = new BrowserWindow({
    width: 200,
    height: 260,
    minWidth: 150,
    minHeight: 200,
    maxWidth: 400,
    maxHeight: 500,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'pet-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  petWindow.loadFile(path.join(__dirname, '..', 'pet', 'index.html'));

  petWindow.on('closed', () => {
    petWindow = null;
  });

  return petWindow;
}

function closePetWindow() {
  if (petWindow) {
    petWindow.close();
    petWindow = null;
  }
}

function sendToPet(channel, data) {
  if (petWindow && !petWindow.isDestroyed()) {
    try { petWindow.webContents.send(channel, data); } catch {}
  }
}

function registerPetIpcHandlers(mainWindow, app) {
  ipcMain.handle('enter-pet-mode', () => {
    const win = createPetWindow(mainWindow, app);
    win.show();
    mainWindow.hide();
    sendToPet('pet-list', { pets: currentPetList, selected: selectedPetIndex });
    return true;
  });

  ipcMain.handle('exit-pet-mode', () => {
    closePetWindow();
    mainWindow.show();
    mainWindow.focus();
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

  ipcMain.handle('pet-drag-start', (_, { offsetX, offsetY }) => {
    if (petWindow && !petWindow.isDestroyed()) {
      const bounds = petWindow.getBounds();
      petWindow._dragOffset = { x: offsetX, y: offsetY };
      petWindow._dragBounds = bounds;
    }
    return true;
  });

  ipcMain.handle('pet-drag-move', (_, { screenX, screenY }) => {
    if (petWindow && !petWindow.isDestroyed() && petWindow._dragOffset) {
      const nx = screenX - petWindow._dragOffset.x;
      const ny = screenY - petWindow._dragOffset.y;
      petWindow.setPosition(nx, ny);
    }
    return true;
  });

  ipcMain.handle('pet-drag-end', () => {
    if (petWindow) {
      petWindow._dragOffset = null;
    }
    return true;
  });

  ipcMain.handle('get-pet-spritesheet', (_, { index }) => {
    if (index >= 0 && index < currentPetList.length) {
      const pet = currentPetList[index];
      try {
        const data = fs.readFileSync(pet.spritesheet);
        return { data: data.toString('base64'), ext: path.extname(pet.spritesheet) };
      } catch {}
    }
    return null;
  });
}

function forwardGameTickToPet(payload) {
  sendToPet('game-tick', payload);
}

module.exports = { scanPets, getPetList, registerPetIpcHandlers, forwardGameTickToPet, closePetWindow };
