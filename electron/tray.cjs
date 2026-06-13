const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;

function createTray(mainWindow) {
  const iconPath = path.join(__dirname, '..', 'icons', '32x32.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: () => {
        if (mainWindow.isVisible()) { mainWindow.hide(); }
        else { mainWindow.show(); mainWindow.focus(); }
      },
    },
    {
      label: 'Show Pet',
      click: () => {
        const { togglePetWindow } = require('./pet.cjs');
        togglePetWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        mainWindow._isQuitting = true;
        require('electron').app.quit();
      },
    },
  ]);

  tray.setToolTip('Idel-DreamMaker');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) { mainWindow.hide(); }
    else { mainWindow.show(); mainWindow.focus(); }
  });

  return tray;
}

function setToolTip(text) {
  if (tray) tray.setToolTip(text);
}

function getTray() {
  return tray;
}

module.exports = { createTray, setToolTip, getTray };
