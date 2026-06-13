const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

function createMainWindow(preloadPath) {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 840,
    minWidth: 280,
    minHeight: 400,
    frame: false,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('close', (e) => {
    if (!mainWindow._isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow._isQuitting) mainWindow.hide();
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = { createMainWindow, getMainWindow };
