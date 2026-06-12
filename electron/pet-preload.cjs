const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  invoke: (channel, ...args) => {
    const validChannels = [
      'enter-pet-mode', 'exit-pet-mode', 'scan-pets', 'select-pet',
      'pet-get-state', 'pet-drag-start', 'pet-drag-move', 'pet-drag-end',
      'get-pet-spritesheet',
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Invalid pet channel: ${channel}`));
  },
  on: (channel, callback) => {
    const validChannels = ['game-tick', 'pet-list', 'pet-selected'];
    if (validChannels.includes(channel)) {
      const listener = (_, data) => callback(data);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    console.warn(`Invalid pet listen channel: ${channel}`);
    return () => {};
  },
});
