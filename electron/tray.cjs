const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';

const LANG = { show:'显示窗口', hide:'隐藏窗口', showPet:'显示宠物', hidePet:'隐藏宠物', quit:'退出' };

let tray = null;
let mainWindowRef = null;

function t(key) { return LANG[key] || key; }

function rebuildMenu() {
  if (!tray || !mainWindowRef) return;
  const winVisible = mainWindowRef.isVisible();
  let petVisible = false;
  try {
    const { getPetWindow } = require('./pet.cjs');
    const pw = getPetWindow ? getPetWindow() : null;
    petVisible = pw && !pw.isDestroyed() && pw.isVisible();
  } catch {}

  const contextMenu = Menu.buildFromTemplate([
    {
      label: winVisible ? t('hide') : t('show'),
      click: () => {
        if (mainWindowRef.isVisible()) { mainWindowRef.hide(); }
        else { mainWindowRef.show(); mainWindowRef.focus(); }
      },
    },
    {
      label: petVisible ? t('hidePet') : t('showPet'),
      click: () => {
        const { togglePetWindow } = require('./pet.cjs');
        togglePetWindow();
      },
    },
    { type: 'separator' },
    {
      label: t('quit'),
      click: () => {
        mainWindowRef._isQuitting = true;
        require('electron').app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray(mainWindow) {
  mainWindowRef = mainWindow;

  let iconPath, icon;
  if (isMac) {
    iconPath = path.join(__dirname, '..', 'icons', 'trayTemplate.png');
    icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(true);
  } else {
    iconPath = path.join(__dirname, '..', 'icons', '32x32.png');
    icon = nativeImage.createFromPath(iconPath);
  }
  tray = new Tray(icon);

  tray.setToolTip('Idel-DreamMaker');
  rebuildMenu();

  tray.on('click', () => {
    if (mainWindow.isVisible()) { mainWindow.hide(); }
    else { mainWindow.show(); mainWindow.focus(); }
  });

  // Rebuild menu on show/hide
  mainWindow.on('show', rebuildMenu);
  mainWindow.on('hide', rebuildMenu);

  return tray;
}

function setToolTip(text) {
  if (tray) tray.setToolTip(text);
}

function getTray() {
  return tray;
}

function updateMenu() {
  rebuildMenu();
}

module.exports = { createTray, setToolTip, getTray, updateMenu };