const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => {
    const validChannels = [
      'get-full-state', 'get-scenario-list', 'set-player-name',
      'select-scenario', 'draw-scenario', 'exit-to-hub',
      'get-hub-titles', 'set-title', 'set-language',
      'set-font-theme',
      'hide-window', 'start-dragging', 'set-window-mode',
      'window-minimize', 'window-toggle-maximize',
      'set-window-position', 'update-tooltip',
      'get-scenario-detail', 'set-scenario-progress',
      'hide-pet-window', 'toggle-pet-window', 'toggle-main-window',
      'dev-trigger-event', 'dev-force-trigger-event', 'dev-level-up', 'dev-achievement', 'dev-runtime', 'dev-force-holiday-event',
      'dev-trigger-story', 'dev-trigger-filler', 'dev-reset-daily', 'dev-hourly-chime', 'dev-reset-save',
      'add-log-entry', 'get-log-dates', 'get-log-entries',
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },
  on: (channel, callback) => {
    const validChannels = [
      'game-tick', 'auto-save', 'event-triggered', 'level-up',
      'achievement-unlocked', 'scenario-changed',
    ];
    if (validChannels.includes(channel)) {
      const listener = (_, data) => callback(data);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    console.warn(`Invalid listen channel: ${channel}`);
    return () => {};
  },
});
