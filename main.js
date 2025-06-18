// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')
const path = require('node:path')

const TARGET_URL = 'http://localhost:9002'; // L'URL della tua app Next.js

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // contextIsolation e nodeIntegration hanno valori predefiniti sicuri.
      // contextIsolation: true, (default)
      // nodeIntegration: false, (default)
    }
  })

  // Tenta di caricare l'URL dell'app Next.js
  mainWindow.loadURL(TARGET_URL)
    .then(() => {
      console.log(`Successfully loaded URL: ${TARGET_URL}`);
    })
    .catch(err => {
      console.error(`Failed to load URL ${TARGET_URL}, error: ${err.message}. Falling back to index.html.`);
      // Se il caricamento dell'URL fallisce (es. ERR_CONNECTION_REFUSED), carica l'index.html locale
      // passando l'errore e l'URL target come parametri querystring.
      mainWindow.loadFile('index.html', { // MODIFIED: Using relative path
        query: { 
          error: err.code || 'UNKNOWN_ERROR', 
          targetUrl: TARGET_URL,
          message: err.message 
        }
      }).catch(loadErr => {
         // Questo catch è per errori nel caricamento di index.html stesso.
         console.error(`Failed to load local index.html as fallback: ${loadErr.message || loadErr.code}`);
      });
    });

  // Open the DevTools (optional, uncomment for debugging).
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.