const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow; // Define this globally

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'MHBrowse',
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      nativeWindowOpen: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Intercept pop-ups and open as new tabs
    mainWindow.webContents.send('open-new-tab', url);
    return { action: 'deny' };
  });
}

// Move these OUT of createWindow
autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'checking', message: 'Checking...' });
});

autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'available', message: 'Downloading...' });
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'update-downloaded', message: 'Ready to Install' });
});

// ... add your error/not-available handlers here too ...

app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});