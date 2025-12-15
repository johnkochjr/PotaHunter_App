/**
 * Preload script - Exposes safe IPC methods to renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Server control
  startServer: () => ipcRenderer.invoke('start-server'),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  updateServerConfig: (config) => ipcRenderer.invoke('update-server-config', config),
  
  // Radio control testing
  testConnection: () => ipcRenderer.invoke('test-hrd-connection'),
  
  // Event listeners
  onLogEntry: (callback) => ipcRenderer.on('log-entry', (event, data) => callback(data)),
  onServerStatus: (callback) => ipcRenderer.on('server-status', (event, data) => callback(data)),
});
