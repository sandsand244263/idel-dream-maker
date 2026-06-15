const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let bubbleWindow = null;
let petWindowRef = null;
let appRef = null;
let currentData = null;

function sendToBubble(channel, data) {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    try { bubbleWindow.webContents.send(channel, data); } catch {}
  }
}

function initBubble(app, petWin) {
  appRef = app;
  petWindowRef = petWin;

  bubbleWindow = new BrowserWindow({
    width: 260,
    height: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'pet-bubble-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  bubbleWindow.loadFile(path.join(__dirname, '..', 'pet-bubble', 'index.html'));

  bubbleWindow.on('blur', () => {
    if (bubbleWindow && !bubbleWindow.isDestroyed()) bubbleWindow.hide();
  });
  bubbleWindow.on('closed', () => { bubbleWindow = null; currentData = null; });
}

function positionAndShowBubble(data) {
  if (!bubbleWindow || bubbleWindow.isDestroyed()) {
    initBubble(appRef, petWindowRef);
    bubbleWindow.webContents.once('did-finish-load', () => {
      doShowBubble(data);
    });
    return;
  }
  doShowBubble(data);
}

function doShowBubble(data) {
  if (!bubbleWindow || bubbleWindow.isDestroyed() || !petWindowRef || petWindowRef.isDestroyed()) return;
  const petBounds = petWindowRef.getBounds();
  const bw = 260, bh = 120;
  const screen = require('electron').screen.getPrimaryDisplay().workAreaSize;

  let x = petBounds.x + Math.floor((petBounds.width - bw) / 2);
  let y = petBounds.y + petBounds.height + 5;
  if (y + bh > screen.height) y = Math.max(0, petBounds.y - bh - 5);

  bubbleWindow.setBounds({ x, y, width: bw, height: bh });
  bubbleWindow.show();
  bubbleWindow.focus();
  if (data) { currentData = data; sendToBubble('show-bubble', data); }
}

function registerBubbleIpcHandlers(app) {
  ipcMain.handle('show-bubble', (_, data) => {
    positionAndShowBubble(data);
    return true;
  });

  ipcMain.handle('close-bubble', () => {
    if (bubbleWindow && !bubbleWindow.isDestroyed()) bubbleWindow.hide();
    return true;
  });
}

module.exports = { registerBubbleIpcHandlers, initBubble, sendToBubble };
