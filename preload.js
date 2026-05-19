const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, value) => callback(value)),
  restartApp: () => ipcRenderer.send('restart-app'),
  onOpenNewTab: (callback) => ipcRenderer.on('open-new-tab', (_event, url) => callback(url))
});
