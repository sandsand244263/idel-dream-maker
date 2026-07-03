const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => {
    const validChannels = [
      'get-full-state', 'get-scenario-list', 'set-player-name',
      'select-scenario', 'exit-to-hub',
      'get-hub-titles', 'set-title', 'get-hub-completion-titles', 'set-completion-title', 'set-language',
      'set-font-theme',
      'hide-window', 'start-dragging', 'set-window-mode',
      'window-minimize', 'window-toggle-maximize',
      'set-window-position', 'update-tooltip',
      'get-scenario-detail', 'set-scenario-progress',
      'get-hub-stats', 'get-hub-title', 'get-hub-achievements',
      'rebirth-scenario', 'get-scenario-unlocks',
      'set-onboarding-seen', 'set-custom-theme',
      'hide-pet-window', 'toggle-pet-window', 'toggle-main-window',
      'open-user-scenarios-folder', 'refresh-user-scenarios',
      'add-log-entry', 'get-log-dates', 'get-log-entries',
      'archive-scenario', 'unarchive-scenario', 'get-archived-scenarios',
      'get-all-complete-prompt', 'dismiss-all-complete-prompt',
      'export-logs-to-desktop', 'open-log-folder', 'open-github-repo',
      'get-key-stats', 'choice-selected',
      'get-sync-path', 'set-sync-path', 'select-sync-directory', 'sync-now', 'delete-save',
      'get-sync-info', 'confirm-sync-directory', 'clear-sync', 'catch-up-advance', 'get-current-theme',
      'check-for-update', 'open-update-url', 'get-proxy-download', 'trigger-update',
      'set-auto-start', 'get-auto-start',
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
      'scenario-ending',
      'scenario-list-updated',
      'choice-event',
      'update-status',
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
