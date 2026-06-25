const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ctxMenu', {
  invoke: (channel, ...args) => {
    const valid = ['show-pet-selector', 'toggle-pet-feature', 'hide-pet-window', 'close-menu', 'get-toggle-state', 'get-current-theme', 'pet-guide', 'launch-system-tool', 'get-available-tools'];
    if (valid.includes(channel)) return ipcRenderer.invoke(channel, ...args);
    return Promise.reject(new Error('Invalid ctxMenu channel: ' + channel));
  },
  on: (channel, callback) => {
    if (channel === 'theme-changed') {
      const fn = (_, d) => callback(d);
      ipcRenderer.on(channel, fn);
      return () => ipcRenderer.removeListener(channel, fn);
    }
    console.warn('Invalid ctxMenu listen channel:', channel);
    return () => {};
  },
});
