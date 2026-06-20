const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const HIDE_POS = { x: -9999, y: -9999 };
let contextWindow = null;
let petWindowRef = null;
let appRef = null;

function hideWindow() {
  if (!contextWindow || contextWindow.isDestroyed()) return;
  contextWindow.setBounds({ x: HIDE_POS.x, y: HIDE_POS.y, width: 170, height: 240 });
  contextWindow.setOpacity(0);
}

function initContextMenu(app, petWin) {
  appRef = app;
  petWindowRef = petWin;

  const ctxOpts = {
    width: 170,
    height: 240,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    show: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'pet-context-menu-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
  if (process.platform === 'darwin') { ctxOpts.type = 'panel'; ctxOpts.acceptFirstMouse = true; }
  contextWindow = new BrowserWindow(ctxOpts);

  contextWindow.loadFile(path.join(__dirname, '..', 'pet-context-menu', 'index.html'));

  contextWindow.webContents.once('did-finish-load', () => {
    contextWindow.setBounds({ x: HIDE_POS.x, y: HIDE_POS.y, width: 170, height: 240 });
    contextWindow.show();
    contextWindow.setOpacity(0);
  });

  contextWindow.on('blur', () => { hideWindow(); });
  contextWindow.on('closed', () => { contextWindow = null; });
}

function doShow() {
  if (!contextWindow || contextWindow.isDestroyed() || !petWindowRef || petWindowRef.isDestroyed()) return;
  const petBounds = petWindowRef.getBounds();
  const cw = 170, ch = 220;
  let x = petBounds.x + petBounds.width + 5;
  const screen = require('electron').screen.getPrimaryDisplay().workAreaSize;
  if (x + cw > screen.width) x = Math.max(0, petBounds.x - cw - 5);
  const y = Math.max(0, petBounds.y);
  contextWindow.setBounds({ x, y, width: cw, height: ch });
  contextWindow.setOpacity(1);
  contextWindow.show();
}

function showContextMenu() {
  if (!contextWindow || contextWindow.isDestroyed()) {
    initContextMenu(appRef, petWindowRef);
    contextWindow.webContents.on('did-finish-load', () => { doShow(); }, { once: true });
    return;
  }
  if (contextWindow.getOpacity() > 0) { hideWindow(); return; }
  doShow();
}

function registerContextMenuIpcHandlers() {
  ipcMain.handle('toggle-pet-feature', (_, { feature, value }) => {
    if (petWindowRef && !petWindowRef.isDestroyed()) {
      try { petWindowRef.webContents.send('toggle-feature', { feature, value }); } catch {}
    }
    return true;
  });

  ipcMain.handle('close-menu', () => { hideWindow(); return true; });

  ipcMain.handle('get-toggle-state', () => {
    return {};
  });

  ipcMain.handle('pet-guide', () => {
    if (petWindowRef && !petWindowRef.isDestroyed()) {
      try { petWindowRef.webContents.send('pet-guide', {}); } catch {}
    }
    return true;
  });
});
}

function sendToContextMenu(channel, data) {
  if (contextWindow && !contextWindow.isDestroyed()) {
    try { contextWindow.webContents.send(channel, data); } catch {}
  }
}

module.exports = { initContextMenu, registerContextMenuIpcHandlers, showContextMenu, sendToContextMenu };
