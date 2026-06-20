const { BrowserWindow } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';

let mainWindow = null;

function createMainWindow(preloadPath) {
  const winOpts = {
    width: 320,
    height: 840,
    minWidth: 280,
    minHeight: 400,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
  if (isMac) {
    winOpts.titleBarStyle = 'hidden';
    winOpts.trafficLightPosition = { x: 10, y: 10 };
  } else {
    winOpts.frame = false;
    winOpts.icon = path.join(__dirname, '..', 'icons', 'icon.png');
  }
  mainWindow = new BrowserWindow(winOpts);

  mainWindow.on('close', (e) => {
    if (!mainWindow._isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow._isQuitting && !mainWindow._ignoreBlur) mainWindow.hide();
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = { createMainWindow, getMainWindow };
