/**
 * Renderer Process - UI Logic
 */

(function() {
  'use strict';

const { electronAPI } = window;

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const testBtn = document.getElementById('testBtn');
const clearLogBtn = document.getElementById('clearLogBtn');
const applyBtn = document.getElementById('applyBtn');

const statusBadge = document.getElementById('statusBadge');
const serverStatus = document.getElementById('serverStatus');
const requestCount = document.getElementById('requestCount');
const errorCount = document.getElementById('errorCount');
const uptime = document.getElementById('uptime');
const activityLog = document.getElementById('activityLog');
const settingsForm = document.getElementById('settingsForm');
const ipAddress = document.getElementById('ipAddress');
const portNumber = document.getElementById('portNumber');

const radioControlSelect = document.getElementById('radioControl');
const hrdSettingsDiv = document.getElementById('hrdSettings');
const flrigSettingsDiv = document.getElementById('flrigSettings');

const loggingModeSelect = document.getElementById('loggingMode');
const hrdLogSettingsDiv = document.getElementById('hrdLogSettings');
const n1mmSettingsDiv = document.getElementById('n1mmSettings');

let uptimeInterval = null;
let serverStartTime = null;

// Initialize
async function init() {
  await loadSettings();
  await updateServerStatus();
  setupEventListeners();
  getLocalIP();
  
  // Listen for events from main process
  electronAPI.onLogEntry(handleLogEntry);
  electronAPI.onServerStatus(handleServerStatusUpdate);
}

// Load settings
async function loadSettings() {
  const settings = await electronAPI.getSettings();
  
  document.getElementById('httpPort').value = settings.httpPort || 7810;
  document.getElementById('radioControl').value = settings.radioControl || 'none';
  document.getElementById('loggingMode').value = settings.loggingMode || 'none';
  
  // HRD settings
  document.getElementById('hrdHost').value = settings.hrdHost || '127.0.0.1';
  document.getElementById('hrdPort').value = settings.hrdPort || 7809;
  
  // FLRIG settings
  document.getElementById('flrigHost').value = settings.flrigHost || '127.0.0.1';
  document.getElementById('flrigPort').value = settings.flrigPort || 12345;
  
  // HRD Logbook settings
  document.getElementById('hrdLogHost').value = settings.hrdLogHost || '127.0.0.1';
  document.getElementById('hrdLogbookPort').value = settings.hrdLogbookPort || 2233;
  
  // N1MM settings
  document.getElementById('n1mmHost').value = settings.n1mmHost || '127.0.0.1';
  document.getElementById('n1mmPort').value = settings.n1mmPort || 12060;
  
  document.getElementById('autoStart').checked = settings.autoStart || false;
  document.getElementById('minimizeToTray').checked = settings.minimizeToTray !== false;
  
  portNumber.textContent = settings.httpPort || 7810;
  
  // Show appropriate settings sections
  updateRadioSettingsVisibility(settings.radioControl || 'none');
  updateLoggingSettingsVisibility(settings.loggingMode || 'none');
}

// Update server status
async function updateServerStatus() {
  const status = await electronAPI.getServerStatus();
  
  updateUI(status.running, status.stats);
}

// Update UI elements
function updateUI(running, stats) {
  // Update status badge
  statusBadge.textContent = running ? 'Running' : 'Stopped';
  statusBadge.className = running ? 'status-badge running' : 'status-badge stopped';
  
  // Update server status text
  serverStatus.textContent = running ? 'Running' : 'Stopped';
  serverStatus.style.color = running ? '#66bb6a' : '#6c757d';
  
  // Update buttons
  startBtn.disabled = running;
  stopBtn.disabled = !running;
  
  // Update stats
  if (stats) {
    requestCount.textContent = stats.requestCount || 0;
    errorCount.textContent = stats.errorCount || 0;
    
    if (running && stats.startTime) {
      serverStartTime = new Date(stats.startTime);
      startUptimeCounter();
    } else {
      stopUptimeCounter();
      uptime.textContent = '--';
    }
  }
}

// Start/stop uptime counter
function startUptimeCounter() {
  stopUptimeCounter();
  
  const updateUptime = () => {
    if (!serverStartTime) return;
    
    const now = new Date();
    const diff = now - serverStartTime;
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    uptime.textContent = `${hours}h ${minutes}m ${seconds}s`;
  };
  
  updateUptime();
  uptimeInterval = setInterval(updateUptime, 1000);
}

function stopUptimeCounter() {
  if (uptimeInterval) {
    clearInterval(uptimeInterval);
    uptimeInterval = null;
  }
  serverStartTime = null;
}

// Event listeners
function setupEventListeners() {
  // Radio control mode change
  radioControlSelect.addEventListener('change', (e) => {
    updateRadioSettingsVisibility(e.target.value);
  });
  
  // Logging mode change
  loggingModeSelect.addEventListener('change', (e) => {
    updateLoggingSettingsVisibility(e.target.value);
  });
  
  startBtn.addEventListener('click', async () => {
    console.log('[Renderer] Start button clicked');
    addLog('info', 'Starting server...');
    
    try {
      const result = await electronAPI.startServer();
      console.log('[Renderer] Start server result:', result);
      
      if (result.success) {
        addLog('success', 'Server started successfully');
      } else {
        addLog('error', `Failed to start server: ${result.error}`);
      }
      
      await updateServerStatus();
    } catch (err) {
      console.error('[Renderer] Error calling startServer:', err);
      addLog('error', `Error: ${err.message}`);
    }
  });
  
  stopBtn.addEventListener('click', async () => {
    addLog('info', 'Stopping server...');
    const result = await electronAPI.stopServer();
    
    if (result.success) {
      addLog('info', 'Server stopped');
    } else {
      addLog('error', `Failed to stop server: ${result.error}`);
    }
    
    await updateServerStatus();
  });
  
  testBtn.addEventListener('click', async () => {
    const radioControl = document.getElementById('radioControl').value;
    
    if (radioControl === 'none') {
      addLog('info', 'No radio control software selected - logging only mode');
      return;
    }
    
    addLog('info', `Testing ${radioControl.toUpperCase()} connection...`);
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    const result = await electronAPI.testConnection();
    
    if (result.success) {
      addLog('success', result.message);
    } else {
      addLog('error', `Connection test failed: ${result.message}`);
    }
    
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  });
  
  clearLogBtn.addEventListener('click', () => {
    activityLog.innerHTML = '<p class="log-entry log-info">📋 Log cleared</p>';
  });
  
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
  });
  
  applyBtn.addEventListener('click', async () => {
    await applySettings();
  });
}

// Update visibility of radio settings based on mode
function updateRadioSettingsVisibility(mode) {
  hrdSettingsDiv.style.display = mode === 'hrd' ? 'block' : 'none';
  flrigSettingsDiv.style.display = mode === 'flrig' ? 'block' : 'none';
}

// Update visibility of logging settings based on mode
function updateLoggingSettingsVisibility(mode) {
  hrdLogSettingsDiv.style.display = mode === 'hrd' ? 'block' : 'none';
  n1mmSettingsDiv.style.display = mode === 'n1mm' ? 'block' : 'none';
}

// Save settings
async function saveSettings() {
  const settings = {
    httpPort: parseInt(document.getElementById('httpPort').value),
    radioControl: document.getElementById('radioControl').value,
    hrdHost: document.getElementById('hrdHost').value,
    hrdPort: parseInt(document.getElementById('hrdPort').value),
    flrigHost: document.getElementById('flrigHost').value,
    flrigPort: parseInt(document.getElementById('flrigPort').value),
    loggingMode: document.getElementById('loggingMode').value,
    hrdLogHost: document.getElementById('hrdLogHost').value,
    hrdLogbookPort: parseInt(document.getElementById('hrdLogbookPort').value),
    n1mmHost: document.getElementById('n1mmHost').value,
    n1mmPort: parseInt(document.getElementById('n1mmPort').value),
    autoStart: document.getElementById('autoStart').checked,
    minimizeToTray: document.getElementById('minimizeToTray').checked,
  };
  
  const result = await electronAPI.saveSettings(settings);
  
  if (result.success) {
    addLog('success', 'Settings saved! Restart the server for changes to take effect.');
    portNumber.textContent = settings.httpPort;
  } else {
    addLog('error', 'Failed to save settings');
  }
}

// Apply settings without saving
async function applySettings() {
  const config = {
    httpPort: parseInt(document.getElementById('httpPort').value),
    radioControl: document.getElementById('radioControl').value,
    hrdHost: document.getElementById('hrdHost').value,
    hrdPort: parseInt(document.getElementById('hrdPort').value),
    flrigHost: document.getElementById('flrigHost').value,
    flrigPort: parseInt(document.getElementById('flrigPort').value),
    loggingMode: document.getElementById('loggingMode').value,
    hrdLogHost: document.getElementById('hrdLogHost').value,
    hrdLogbookPort: parseInt(document.getElementById('hrdLogbookPort').value),
    n1mmHost: document.getElementById('n1mmHost').value,
    n1mmPort: parseInt(document.getElementById('n1mmPort').value),
  };
  
  addLog('info', 'Applying settings...');
  const result = await electronAPI.updateServerConfig(config);
  
  if (result.success) {
    addLog('success', 'Settings applied! Server restarted with new configuration.');
    portNumber.textContent = config.httpPort;
    await updateServerStatus();
  } else {
    addLog('error', `Failed to apply settings: ${result.error}`);
  }
}

// Update radio settings visibility
function updateRadioSettingsVisibility(mode) {
  hrdSettingsDiv.style.display = mode === 'hrd' ? 'block' : 'none';
  flrigSettingsDiv.style.display = mode === 'flrig' ? 'block' : 'none';
  
  // Update test button text
  const testBtnText = mode === 'none' ? 'Test Connection' : `Test ${mode.toUpperCase()} Connection`;
  testBtn.textContent = testBtnText;
}

// Handle log entries from main process
function handleLogEntry(logEntry) {
  addLog(logEntry.type, logEntry.message);
}

// Handle server status updates
function handleServerStatusUpdate(status) {
  updateUI(status.running);
}

// Add log entry
function addLog(type, message) {
  const timestamp = new Date().toLocaleTimeString();
  const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  
  const entry = document.createElement('p');
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span>${icon} ${message}`;
  
  activityLog.appendChild(entry);
  activityLog.scrollTop = activityLog.scrollHeight;
  
  // Keep only last 100 entries
  while (activityLog.children.length > 100) {
    activityLog.removeChild(activityLog.firstChild);
  }
}

// Get local IP address
function getLocalIP() {
  // This is a simple approach - gets external IP
  // For local network IP, we'd need to use Node.js os module via IPC
  fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
      ipAddress.textContent = data.ip;
    })
    .catch(() => {
      ipAddress.textContent = 'Unable to detect (check network settings)';
    });
  
  // Also try to get local network IP via a simple trick
  const rtc = new RTCPeerConnection({ iceServers: [] });
  rtc.createDataChannel('');
  
  rtc.createOffer().then(offer => rtc.setLocalDescription(offer));
  
  rtc.onicecandidate = (event) => {
    if (event && event.candidate && event.candidate.candidate) {
      const candidate = event.candidate.candidate;
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
      const match = ipRegex.exec(candidate);
      
      if (match && match[1]) {
        const localIP = match[1];
        // Prefer local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (localIP.startsWith('192.168.') || 
            localIP.startsWith('10.') || 
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(localIP)) {
          ipAddress.textContent = localIP;
          rtc.close();
        }
      }
    }
  };
}

// Prevent drag and drop events (Electron default behavior)
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// Initialize on load
init();

})(); // End IIFE
