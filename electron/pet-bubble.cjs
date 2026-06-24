const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const HIDE_POS = { x: -9999, y: -9999 };
let bubbleWindow = null;
let petWindowRef = null;
let appRef = null;
let currentData = null;

function sendToBubble(channel, data) {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    try { bubbleWindow.webContents.send(channel, data); } catch {}
  }
}

function hideBubble() {
  if (!bubbleWindow || bubbleWindow.isDestroyed()) return;
  if (bubbleWindow.getOpacity() === 0) return;
  if (isChoiceBubble) return; // choice bubbles don't auto-hide
  bubbleWindow.setBounds({ x: HIDE_POS.x, y: HIDE_POS.y, width: 260, height: 100 });
  bubbleWindow.setOpacity(0);
  if (petWindowRef && !petWindowRef.isDestroyed()) {
    try { petWindowRef.webContents.send('bubble-closed', {}); } catch {}
  }
}

function initBubble(app, petWin) {
  appRef = app;
  petWindowRef = petWin;

  const bubbleOpts = {
    width: 260,
    height: 100,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    show: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'pet-bubble-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
  if (process.platform === 'darwin') { bubbleOpts.type = 'panel'; bubbleOpts.acceptFirstMouse = true; }
  bubbleWindow = new BrowserWindow(bubbleOpts);

  bubbleWindow.loadFile(path.join(__dirname, '..', 'pet-bubble', 'index.html'));

  bubbleWindow.webContents.once('did-finish-load', () => {
    bubbleWindow.setBounds({ x: HIDE_POS.x, y: HIDE_POS.y, width: 260, height: 100 });
    bubbleWindow.show();
    bubbleWindow.setOpacity(0);
  });

  bubbleWindow.on('blur', () => { hideBubble(); });
  bubbleWindow.on('closed', () => { bubbleWindow = null; currentData = null; });
}

let isChoiceBubble = false;

function doShowBubble(data) {
  if (!bubbleWindow || bubbleWindow.isDestroyed() || !petWindowRef || petWindowRef.isDestroyed()) return;
  const petBounds = petWindowRef.getBounds();
  const bw = 260;
  const screen = require('electron').screen.getPrimaryDisplay().workAreaSize;

  if (data) { currentData = data; sendToBubble('show-bubble', data); }
  isChoiceBubble = !!(data && data.choices);

  setImmediate(() => {
    const extraH = data && data.choices ? 60 : 0;
    bubbleWindow.webContents.executeJavaScript(
      `(function(){
        const body = document.getElementById('bubble-body');
        const header = document.getElementById('bubble-header');
        if (!body) return ${70 + extraH};
        const bodyH = body.scrollHeight;
        const headerH = header ? header.scrollHeight : 0;
        const gap = bodyH > 0 ? 16 : 0;
        return Math.max(${70 + extraH}, Math.min(bodyH + headerH + gap + ${extraH}, 350));
      })()`
    ).then(actualH => {
      let nx = petBounds.x + Math.floor((petBounds.width - bw) / 2);
      let ny = petBounds.y + petBounds.height + 5;
      if (ny + actualH > screen.height) ny = Math.max(0, petBounds.y - actualH - 5);
      bubbleWindow.setBounds({ x: nx, y: ny, width: bw, height: actualH });
      bubbleWindow.setOpacity(1);
      bubbleWindow.show();
    }).catch(() => {
      bubbleWindow.setBounds({ x: petBounds.x + Math.floor((petBounds.width - bw) / 2), y: petBounds.y + petBounds.height + 5, width: bw, height: 100 + extraH });
      bubbleWindow.setOpacity(1);
      bubbleWindow.show();
    });
  });
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

function registerBubbleIpcHandlers(app) {
  ipcMain.handle('show-bubble', (_, data) => {
    isChoiceBubble = false;
    positionAndShowBubble(data);
    return true;
  });

  ipcMain.handle('show-choice-bubble', (_, data) => {
    isChoiceBubble = true;
    positionAndShowBubble({ ...data, choices: data.choices });
    return true;
  });

  ipcMain.handle('close-bubble', () => { hideBubble(); return true; });
}

module.exports = { registerBubbleIpcHandlers, initBubble, sendToBubble };
