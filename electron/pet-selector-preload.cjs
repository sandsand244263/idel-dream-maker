const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petSelector', {
  invoke: (channel, ...args) => {
    const valid = ['select-pet', 'close-selector', 'open-pets-folder', 'get-initial-state'];
    if (valid.includes(channel)) return ipcRenderer.invoke(channel, ...args);
    return Promise.reject(new Error('Invalid selector channel: ' + channel));
  },
  on: (channel, callback) => {
    if (channel === 'pet-list') {
      const fn = (_, d) => callback(d);
      ipcRenderer.on(channel, fn);
      return () => ipcRenderer.removeListener(channel, fn);
    }
    console.warn('Invalid selector listen channel:', channel);
    return () => {};
  },
});
