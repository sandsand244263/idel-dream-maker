const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let contextWindow = null;
let petWindowRef = null;
let appRef = null;

function initContextMenu(app, petWin) {
  appRef = app;
  petWindowRef = petWin;

  contextWindow = new BrowserWindow({
    width: 170,
    height: 240,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'pet-context-menu-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  contextWindow.loadFile(path.join(__dirname, '..', 'pet-context-menu', 'index.html'));
  contextWindow.on('closed', () => { contextWindow = null; });
}

function showContextMenu() {
  console.log('[ctx] show called, win:', !!contextWindow, 'destroyed:', contextWindow ? contextWindow.isDestroyed() : 'N/A');
  if (!contextWindow || contextWindow.isDestroyed()) {
    console.log('[ctx] recreating window');
    initContextMenu(appRef, petWindowRef);
    contextWindow.webContents.once('did-finish-load', () => {
      doShow();
    });
    return;
  }
  doShow();
}

function doShow() {
  if (!contextWindow || contextWindow.isDestroyed() || !petWindowRef || petWindowRef.isDestroyed()) return;
  const petBounds = petWindowRef.getBounds();
  const cw = 170, ch = 220;
  let x = petBounds.x + petBounds.width + 5;
  const screen = require('electron').screen.getPrimaryDisplay().workAreaSize;
  if (x + cw > screen.width) x = Math.max(0, petBounds.x - cw - 5);
  const y = Math.max(0, petBounds.y);
  console.log('[ctx] setBounds:', { x, y, width: cw, height: ch });
  contextWindow.setBounds({ x, y, width: cw, height: ch });
  contextWindow.show();
  contextWindow.focus();
  console.log('[ctx] show+focus done');
}

function registerContextMenuIpcHandlers() {
  ipcMain.handle('toggle-pet-feature', (_, { feature, value }) => {
    if (petWindowRef && !petWindowRef.isDestroyed()) {
      try { petWindowRef.webContents.send('toggle-feature', { feature, value }); } catch {}
    }
    return true;
  });

  ipcMain.handle('close-menu', () => {
    if (contextWindow && !contextWindow.isDestroyed()) contextWindow.hide();
    return true;
  });

  ipcMain.handle('close-context-menu', () => {
    if (contextWindow && !contextWindow.isDestroyed()) contextWindow.hide();
    return true;
  });

  ipcMain.handle('get-toggle-state', () => {
    return {};
  });
}

module.exports = { initContextMenu, registerContextMenuIpcHandlers, showContextMenu };
