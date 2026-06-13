const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let selectorWindow = null;
let currentPetList = [];
let selectedPetIndex = 0;

function sendToSelector(channel, data) {
  if (selectorWindow && !selectorWindow.isDestroyed()) {
    try { selectorWindow.webContents.send(channel, data); } catch {}
  }
}

function createSelectorWindow(app) {
  if (selectorWindow && !selectorWindow.isDestroyed()) {
    selectorWindow.focus();
    return selectorWindow;
  }

  selectorWindow = new BrowserWindow({
    width: 180,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'pet-selector-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  selectorWindow.loadFile(path.join(__dirname, '..', 'pet-selector', 'index.html'));

  selectorWindow.on('blur', () => {
    if (selectorWindow && !selectorWindow.isDestroyed()) selectorWindow.close();
  });

  selectorWindow.on('closed', () => { selectorWindow = null; });

  return selectorWindow;
}

function positionSelectorWindow() {
  if (!selectorWindow || !selectorWindow.isDestroyed()) return;
  const wins = BrowserWindow.getAllWindows();
  const petWin = wins.find(w => !w.isDestroyed() && w !== selectorWindow && w.getBounds().width === 192);
  if (!petWin) return;
  const petBounds = petWin.getBounds();
  const selWidth = 180;
  const selHeight = Math.min(240, Math.max(120, (currentPetList.length || 1) * 32 + 60));

  let x, y = petBounds.y;
  if (petBounds.x + petBounds.width + selWidth + 10 < require('electron').screen.getPrimaryDisplay().workAreaSize.width) {
    x = petBounds.x + petBounds.width + 5;
  } else {
    x = Math.max(0, petBounds.x - selWidth - 5);
  }

  selectorWindow.setBounds({ x, y, width: selWidth, height: selHeight });
  selectorWindow.show();
  selectorWindow.focus();
}

function registerSelectorIpcHandlers(app) {

  ipcMain.handle('show-pet-selector', () => {
    const { scanPets } = require('./pet.cjs');
    currentPetList = scanPets(app);
    selectedPetIndex = 0;
    createSelectorWindow(app);
    positionSelectorWindow();
    sendToSelector('pet-list', { pets: currentPetList, selected: selectedPetIndex });
    return true;
  });

  ipcMain.handle('get-initial-state', () => {
    return { pets: currentPetList, selected: selectedPetIndex };
  });

  ipcMain.handle('close-selector', () => {
    if (selectorWindow && !selectorWindow.isDestroyed()) selectorWindow.close();
    return true;
  });
}

module.exports = { registerSelectorIpcHandlers, sendToSelector };
