const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petBubble', {
  invoke: (channel, ...args) => {
    if (channel === 'close-bubble' || channel === 'get-current-theme') return ipcRenderer.invoke(channel, ...args);
    return Promise.reject(new Error('Invalid bubble channel: ' + channel));
  },
  on: (channel, callback) => {
    if (channel === 'show-bubble' || channel === 'hide-bubble') {
      const fn = (_, d) => callback(d);
      ipcRenderer.on(channel, fn);
      return () => ipcRenderer.removeListener(channel, fn);
    }
    console.warn('Invalid bubble listen channel:', channel);
    return () => {};
  },
});
