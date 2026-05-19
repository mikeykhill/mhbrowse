const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: 'MHBrowse',
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true, 
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('update-status', { status: 'checking', message: 'Checking for updates...' });
  });

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update-status', { status: 'available', message: 'Update available. Downloading...' });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-status', { status: 'up-to-date', message: 'Up to date' });
  });

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update-status', { status: 'error', message: 'Update error' });
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-status', { status: 'update-downloaded', message: 'Ready to Install' });
  });
}

app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});