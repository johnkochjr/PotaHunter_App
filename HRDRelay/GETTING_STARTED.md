# Quick Start Guide - HRD Relay GUI

## What You Just Got

A full-featured GUI application for the HRD Relay with:

✅ **Visual Interface** - No more command line!
✅ **Settings Management** - Save and configure all relay settings
✅ **Activity Monitor** - See all connections and activity in real-time  
✅ **System Tray** - Runs in background, minimizes to tray
✅ **Connection Helper** - Shows your IP address for easy setup
✅ **HRD Testing** - Test connection to Ham Radio Deluxe before starting

## First Time Setup

The app is now running! You should see a window with:

### 1. Server Control Panel
- **Start Server** - Click to start accepting connections
- **Stop Server** - Stop the relay
- **Test HRD Connection** - Verify HRD is responding

### 2. Settings Section
Configure these before starting:

- **HTTP Port**: 7810 (default - port your phone connects to)
- **HRD Host**: 127.0.0.1 (if HRD is on same computer)
- **HRD Control Port**: 7809 (default HRD TCP port)
- **HRD Logbook Port**: 2333 (default HRD UDP logging port)
- **Auto-start**: Check to start server when app launches
- **Minimize to Tray**: Keep running in background

### 3. Activity Log
Real-time log showing:
- Server start/stop events
- Incoming connections from your phone
- Frequency changes sent to HRD
- QSO logging attempts
- Any errors

### 4. Connection Info
Shows the IP address to use in your PotaHunter app settings.

## Using in the Field

### Option A: Mac Creates WiFi Network

1. **On Mac**: System Settings > General > Sharing > Internet Sharing
2. Share from: USB Ethernet (or any unused adapter)
3. To computers using: Wi-Fi
4. Click Wi-Fi Options: Set name/password
5. Enable Internet Sharing
6. **Start HRD Relay app** and click Start Server
7. **On iPhone**: Join the network you just created
8. **In PotaHunter app**: Settings > HRD Integration
   - IP: `192.168.2.1` (default Mac hotspot IP)
   - Port: `7810`
   - Test Connection

### Option B: iPhone Creates Hotspot

1. **On iPhone**: Settings > Personal Hotspot > Enable
2. **On Mac**: Join iPhone's hotspot
3. **Find Mac's IP**: Look at the Connection Info in HRD Relay app
4. **Start server** in HRD Relay
5. **In PotaHunter app**: Use the IP shown (usually `172.20.10.x`)

### Option C: Windows Hotspot

1. **On Windows**: Settings > Network > Mobile hotspot > Turn on
2. **On iPhone**: Join Windows hotspot
3. **Start HRD Relay app**
4. **Windows IP** will typically be `192.168.137.1`
5. **In PotaHunter app**: Use that IP with port 7810

## System Tray Usage

When you close the window (if "Minimize to Tray" is enabled):
- App keeps running in system tray
- Click tray icon to show window
- Right-click tray icon for menu:
  - Show Window
  - Start/Stop Server
  - Quit

## Building Desktop Apps

To create standalone executables:

```bash
cd /Users/johnkoch/repos/PotaHunter_App/HRDRelay

# Build for Mac
npm run build:mac

# Build for Windows (on Mac requires wine)
npm run build:win

# Build for both
npm run build
```

Apps will be in `dist/` folder.

## Troubleshooting

**App won't start:**
- Make sure you're in the HRDRelay directory
- Run `npm install` first
- Run `npm start`

**Can't test HRD connection:**
- Make sure Ham Radio Deluxe is running
- In HRD: Tools > Server > Make sure TCP server is enabled
- Check port is 7809

**Phone can't connect:**
- Both devices must be on same WiFi network
- Check firewall isn't blocking port 7810
- Verify IP address matches what's shown in app

**Server won't start:**
- Port 7810 might be in use
- Try changing HTTP Port in settings
- Check Activity Log for error details

## Development

The GUI is built with:
- **Electron** - Desktop app framework
- **electron-store** - Settings persistence
- **relay-server.js** - The actual relay logic (refactored from relay.js)

Files:
- `main.js` - Electron main process
- `preload.js` - IPC bridge
- `renderer.html` - UI structure
- `renderer.css` - Styling
- `renderer.js` - UI logic
- `relay-server.js` - Server module
- `relay.js` - Original CLI version (still works with `npm run start-cli`)

## Next Steps

1. ✅ Start the server
2. ✅ Test HRD connection
3. ✅ Configure your phone to connect
4. ✅ Try logging a QSO from your phone!

The app will remember all your settings, so next time you can just click "Start Server" and go!
