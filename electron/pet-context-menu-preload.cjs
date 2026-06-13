const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ctxMenu', {
  invoke: (channel, ...args) => {
    const valid = ['show-pet-selector', 'toggle-pet-feature', 'open-pets-folder', 'hide-pet-window', 'close-menu', 'get-toggle-state'];
    if (valid.includes(channel)) return ipcRenderer.invoke(channel, ...args);
    return Promise.reject(new Error('Invalid ctxMenu channel: ' + channel));
  },
});
