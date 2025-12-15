# HRD Relay GUI Application

A graphical user interface for the HRD Relay server, built with Electron.

## Features

- 🎛️ **Visual Server Control** - Start/stop the relay server with one click
- ⚙️ **Settings Management** - Configure HTTP port, HRD host/port, and logbook settings
- 📊 **Activity Monitoring** - Real-time log of relay activity and connection attempts
- 🔔 **System Tray Integration** - Minimize to tray and control from system menu
- 🧪 **Connection Testing** - Test HRD connection before starting
- 💾 **Persistent Settings** - All settings saved automatically
- 📱 **Connection Helper** - Shows your IP address for easy app setup

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application:
   ```bash
   npm start
   ```

## Building Executables

Build for macOS:
```bash
npm run build:mac
```

Build for Windows:
```bash
npm run build:win
```

Build for both:
```bash
npm run build
```

## Usage

1. **Start the app** - Launch HRD Relay from your applications folder
2. **Configure settings** - Set your HRD connection details (default: 127.0.0.1:7809)
3. **Start server** - Click "Start Server" to begin accepting connections
4. **Connect from app** - Use the IP address shown in the Connection Info section

## Settings

- **HTTP Port** - Port for the HTTP relay server (default: 7810)
- **HRD Host** - IP address of the computer running HRD (default: 127.0.0.1)
- **HRD Control Port** - TCP port for HRD commands (default: 7809)
- **HRD Logbook Port** - UDP port for logging QSOs (default: 2333)
- **Auto-start** - Automatically start server when app launches
- **Minimize to Tray** - Keep running in system tray when window closed

## System Tray

When minimized to tray, you can:
- Show/hide the window
- Start/stop the server
- See server status
- Quit the application

## Field Operation

For park activation:

1. **Create WiFi Network** - Use your Mac's Internet Sharing or Windows Mobile Hotspot
2. **Connect phone** - Join your iPhone to the created network
3. **Start HRD Relay** - Launch the app and start the server
4. **Configure app** - Use the IP shown in the app (usually 192.168.2.1 for Mac)

## CLI Mode (Legacy)

You can still run the original command-line version:

```bash
npm run start-cli
```

## Troubleshooting

**Can't connect from phone:**
- Ensure both devices are on the same WiFi network
- Check firewall settings on your computer
- Verify the IP address matches what's shown in the app

**HRD test fails:**
- Make sure Ham Radio Deluxe is running
- Check HRD's TCP server is enabled (Tools > Server)
- Verify port 7809 is not blocked by firewall

**Server won't start:**
- Check if another application is using port 7810
- Try changing the HTTP port in settings

## License

MIT
