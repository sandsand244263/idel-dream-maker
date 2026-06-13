const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let bubbleWindow = null;
let currentData = null;

function sendToBubble(channel, data) {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    try { bubbleWindow.webContents.send(channel, data); } catch {}
  }
}

function createBubbleWindow(app) {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    if (currentData) sendToBubble('show-bubble', currentData);
    bubbleWindow.focus();
    return bubbleWindow;
  }

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
    if (bubbleWindow && !bubbleWindow.isDestroyed()) bubbleWindow.close();
  });

  bubbleWindow.on('closed', () => { bubbleWindow = null; currentData = null; });

  return bubbleWindow;
}

function positionBubbleWindow(data) {
  if (!bubbleWindow || !bubbleWindow.isDestroyed()) return;
  const wins = BrowserWindow.getAllWindows();
  const petWin = wins.find(w => !w.isDestroyed() && w !== bubbleWindow && w.getBounds().width === 192);
  if (!petWin) return;
  const petBounds = petWin.getBounds();
  const bw = 260, bh = 120;
  const screen = require('electron').screen.getPrimaryDisplay().workAreaSize;

  let x, y = petBounds.y + 40;
  if (petBounds.x + petBounds.width + bw + 10 < screen.width) {
    x = petBounds.x + petBounds.width + 5;
  } else if (petBounds.x - bw - 10 >= 0) {
    x = petBounds.x - bw - 5;
  } else {
    x = Math.max(5, Math.floor((screen.width - bw) / 2));
    y = Math.max(5, Math.floor((screen.height - bh) / 2));
  }

  bubbleWindow.setBounds({ x, y, width: bw, height: bh });
  bubbleWindow.show();
  bubbleWindow.focus();
  if (data) { currentData = data; sendToBubble('show-bubble', data); }
}

function registerBubbleIpcHandlers(app) {

  ipcMain.handle('show-bubble', (_, data) => {
    createBubbleWindow(app);
    if (bubbleWindow && !bubbleWindow.isDestroyed()) {
      const finish = () => positionBubbleWindow(data);
      bubbleWindow.webContents.once('did-finish-load', finish);
      if (!bubbleWindow.webContents.isLoading()) finish();
    }
    return true;
  });

  ipcMain.handle('close-bubble', () => {
    if (bubbleWindow && !bubbleWindow.isDestroyed()) bubbleWindow.close();
    return true;
  });
}

module.exports = { registerBubbleIpcHandlers };
