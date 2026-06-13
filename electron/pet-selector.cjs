const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let selectorWindow = null;
let petWindowRef = null;
let currentPetList = [];
let selectedPetIndex = 0;

function sendToSelector(channel, data) {
  if (selectorWindow && !selectorWindow.isDestroyed()) {
    try { selectorWindow.webContents.send(channel, data); } catch {}
  }
}

function initSelector(app, petWin) {
  petWindowRef = petWin;

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
    console.log('[sel] blur fired');
    if (selectorWindow && !selectorWindow.isDestroyed()) selectorWindow.hide();
  });

  selectorWindow.on('closed', () => {
    console.log('[sel] closed');
    selectorWindow = null;
  });
}

function positionAndShowSelector() {
  console.log('[sel] positionAndShowSelector, selWin:', !!selectorWindow, 'petWinRef:', !!petWindowRef);
  if (!selectorWindow || selectorWindow.isDestroyed() || !petWindowRef || petWindowRef.isDestroyed()) {
    console.log('[sel] bail - ref invalid');
    return;
  }
  const petBounds = petWindowRef.getBounds();
  console.log('[sel] petBounds:', JSON.stringify(petBounds));
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
  console.log('[sel] setBounds+show:', { x, y, width: selWidth, height: selHeight });
  selectorWindow.show();
  selectorWindow.focus();
}

function registerSelectorIpcHandlers(app) {
  ipcMain.handle('show-pet-selector', () => {
    const { scanPets } = require('./pet.cjs');
    currentPetList = scanPets(app);
    selectedPetIndex = 0;
    sendToSelector('pet-list', { pets: currentPetList, selected: selectedPetIndex });
    positionAndShowSelector();
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

module.exports = { registerSelectorIpcHandlers, initSelector };
