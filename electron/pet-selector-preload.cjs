const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petSelector', {
  invoke: (channel, ...args) => {
    const valid = ['select-pet', 'close-selector', 'open-pets-folder', 'open-external-link', 'get-initial-state', 'show-context-menu', 'get-current-theme'];
    if (valid.includes(channel)) return ipcRenderer.invoke(channel, ...args);
    return Promise.reject(new Error('Invalid selector channel: ' + channel));
  },
  on: (channel, callback) => {
    if (channel === 'pet-list' || channel === 'theme-changed') {
      const fn = (_, d) => callback(d);
      ipcRenderer.on(channel, fn);
      return () => ipcRenderer.removeListener(channel, fn);
    }
    console.warn('Invalid selector listen channel:', channel);
    return () => {};
  },
});
