/**
 * HRD Relay - Electron Main Process
 */

const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const path = require('path');
const Store = require('electron-store');
const RelayServer = require('./relay-server');

// Settings store
const store = new Store({
  defaults: {
    httpPort: 7810,
    radioControl: 'none',
    hrdHost: '127.0.0.1',
    hrdPort: 7809,
    flrigHost: '127.0.0.1',
    flrigPort: 12345,
    loggingMode: 'none',
    hrdLogHost: '127.0.0.1',
    hrdLogbookPort: 2333,
    n1mmHost: '127.0.0.1',
    n1mmPort: 12060,
    autoStart: false,
    minimizeToTray: true,
  }
});

let mainWindow = null;
let tray = null;
let relayServer = null;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'HRD Relay Server',
  });

  mainWindow.loadFile('renderer.html');

  // Open DevTools in development
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('close', (event) => {
    if (store.get('minimizeToTray') && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // On macOS, show a message that the app is still running
      if (process.platform === 'darwin' && tray) {
        tray.displayBalloon({
          title: 'HRD Relay',
          content: 'App is still running in the menu bar. Right-click the icon to quit.'
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create system tray
function createTray() {
  const { nativeImage } = require('electron');
  
  // Create a simple 16x16 image for the tray icon
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setTitle('HRD'); // Shows text in menu bar on macOS
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Server Status: Stopped',
      enabled: false,
    },
    {
      type: 'separator'
    },
    {
      label: 'Start Server',
      click: () => {
        startServer();
      }
    },
    {
      label: 'Stop Server',
      enabled: false,
      click: () => {
        stopServer();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('POTA Relay - Stopped');
  
  tray.on('click', () => {
    mainWindow.show();
  });
}

// Update tray menu
function updateTrayMenu(running) {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: `Server Status: ${running ? 'Running' : 'Stopped'}`,
      enabled: false,
    },
    {
      type: 'separator'
    },
    {
      label: 'Start Server',
      enabled: !running,
      click: () => {
        startServer();
      }
    },
    {
      label: 'Stop Server',
      enabled: running,
      click: () => {
        stopServer();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`POTA Relay - ${running ? 'Running' : 'Stopped'}`);
}

// Initialize relay server
function initializeRelay() {
  const config = {
    httpPort: store.get('httpPort'),
    radioControl: store.get('radioControl'),
    hrdHost: store.get('hrdHost'),
    hrdPort: store.get('hrdPort'),
    flrigHost: store.get('flrigHost'),
    flrigPort: store.get('flrigPort'),
    loggingMode: store.get('loggingMode'),
    hrdLogHost: store.get('hrdLogHost'),
    hrdLogbookPort: store.get('hrdLogbookPort'),
    n1mmHost: store.get('n1mmHost'),
    n1mmPort: store.get('n1mmPort'),
  };

  console.log('[Main] Initializing relay server with config:', config);
  relayServer = new RelayServer(config);

  // Forward events to renderer
  relayServer.on('log', (logEntry) => {
    if (mainWindow) {
      mainWindow.webContents.send('log-entry', logEntry);
    }
  });

  relayServer.on('started', () => {
    updateTrayMenu(true);
    if (mainWindow) {
      mainWindow.webContents.send('server-status', { running: true });
    }
  });

  relayServer.on('stopped', () => {
    updateTrayMenu(false);
    if (mainWindow) {
      mainWindow.webContents.send('server-status', { running: false });
    }
  });
}

// Start server
async function startServer() {
  try {
    console.log('[Main] Starting relay server...');
    await relayServer.start();
    console.log('[Main] Relay server started successfully');
    return { success: true };
  } catch (err) {
    console.error('[Main] Failed to start server:', err);
    return { success: false, error: err.message };
  }
}

// Stop server
async function stopServer() {
  try {
    await relayServer.stop();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// IPC Handlers
ipcMain.handle('get-settings', () => {
  return store.store;
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set(settings);
  return { success: true };
});

ipcMain.handle('update-server-config', async (event, config) => {
  try {
    await relayServer.updateConfig(config);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('start-server', async () => {
  return startServer();
});

ipcMain.handle('stop-server', async () => {
  return stopServer();
});

ipcMain.handle('get-server-status', () => {
  return {
    running: relayServer.isRunning,
    stats: relayServer.stats,
    config: relayServer.config,
  };
});

ipcMain.handle('test-hrd-connection', async () => {
  try {
    const radioControl = store.get('radioControl');
    
    if (radioControl === 'none') {
      return {
        success: true,
        message: 'No radio control configured - logging only mode'
      };
    }
    
    if (radioControl === 'hrd') {
      const frequency = await relayServer.sendHRDCommand('get frequency');
      return { 
        success: true, 
        message: `HRD responding, frequency: ${frequency}`,
        frequency 
      };
    }
    
    if (radioControl === 'flrig') {
      const result = await relayServer.testFLRIGConnection();
      return result;
    }
    
    return {
      success: false,
      message: 'Unknown radio control mode'
    };
  } catch (err) {
    return { 
      success: false, 
      message: err.message 
    };
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  initializeRelay();

  // Set up application menu with Quit command
  const { Menu } = require('electron');
  const template = [
    {
      label: 'POTA Relay',
      submenu: [
        {
          label: 'About POTA Relay',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Auto-start if enabled
  if (store.get('autoStart')) {
    startServer();
  }
});

app.on('window-all-closed', () => {
  // Don't quit on macOS when minimize to tray is enabled
  // The tray icon will remain and user can quit from there
  if (process.platform !== 'darwin' || !store.get('minimizeToTray')) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  if (relayServer && relayServer.isRunning) {
    await stopServer();
  }
});
