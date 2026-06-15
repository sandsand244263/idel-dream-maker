const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let selectorWindow = null;
let petWindowRef = null;
let appRef = null;
let currentPetList = [];
let selectedPetIndex = 0;

function sendToSelector(channel, data) {
  if (selectorWindow && !selectorWindow.isDestroyed()) {
    try { selectorWindow.webContents.send(channel, data); } catch {}
  }
}

function initSelector(app, petWin) {
  appRef = app;
  petWindowRef = petWin;

  selectorWindow = new BrowserWindow({
    width: 180,
    height: 200,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
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
    if (selectorWindow && !selectorWindow.isDestroyed()) selectorWindow.hide();
  });
  selectorWindow.on('closed', () => { selectorWindow = null; });
}

function positionAndShowSelector() {
  if (!selectorWindow || selectorWindow.isDestroyed()) {
    initSelector(appRef, petWindowRef);
    selectorWindow.webContents.once('did-finish-load', () => {
      doShowSelector();
    });
    return;
  }
  doShowSelector();
}

function doShowSelector() {
  if (!selectorWindow || selectorWindow.isDestroyed() || !petWindowRef || petWindowRef.isDestroyed()) return;
  const petBounds = petWindowRef.getBounds();
  const selWidth = 180;
  const selHeight = Math.min(240, Math.max(120, (currentPetList.length || 1) * 32 + 60));

  let x, y = petBounds.y;
  const screen = require('electron').screen.getPrimaryDisplay().workAreaSize;
  if (petBounds.x + petBounds.width + selWidth + 10 < screen.width) {
    x = petBounds.x + petBounds.width + 5;
  } else {
    x = Math.max(0, petBounds.x - selWidth - 5);
  }

  selectorWindow.setBounds({ x, y, width: selWidth, height: selHeight });
  selectorWindow.showInactive();
}

function registerSelectorIpcHandlers(app) {
  ipcMain.handle('show-pet-selector', () => {
    const { scanPets, getSelectedPetIndex } = require('./pet.cjs');
    currentPetList = scanPets(app);
    selectedPetIndex = getSelectedPetIndex();
    sendToSelector('pet-list', { pets: currentPetList, selected: selectedPetIndex });
    positionAndShowSelector();
    return true;
  });

  ipcMain.handle('get-initial-state', () => {
    return { pets: currentPetList, selected: selectedPetIndex };
  });

  ipcMain.handle('close-selector', () => {
    if (selectorWindow && !selectorWindow.isDestroyed()) selectorWindow.hide();
    return true;
  });
}

module.exports = { registerSelectorIpcHandlers, initSelector, sendToSelector };
