# Internal Logging Feature

## Overview

The POTA Hunter app now includes an **internal logging system** that saves QSO details locally when the HRD relay is unavailable. This ensures you never lose contact information, even when your radio control PC is offline or the relay connection fails.

## Features

### Automatic Backup Logging
- **Automatic Fallback**: When the HRD relay is unavailable or returns an error, QSOs are automatically saved to internal storage
- **Always-On Option**: QSOs are saved to internal logs alongside HRD logging for backup purposes
- **Detailed Records**: Stores all QSO information including:
  - Callsign and park reference
  - Frequency, mode, and band
  - RST sent/received
  - Your callsign
  - Park name and location
  - Timestamp
  - Reason for local save (relay unavailable, HRD error, or manual)
  - Comments

### Export Capabilities
The internal logs can be exported in two industry-standard formats:

#### CSV Export
- Spreadsheet-friendly format
- All fields included for analysis
- Compatible with Excel, Google Sheets, etc.
- Great for record-keeping and analysis

#### ADIF Export
- Amateur Data Interchange Format (ADIF v3.1.4)
- Standard format for ham radio logging
- Can be imported into:
  - Ham Radio Deluxe
  - Log4OM
  - N3FJP software
  - QRZ.com
  - LoTW (Logbook of The World)
  - Most other logging applications
- Includes POTA-specific fields (`SIG` and `SIG_INFO`)

### Log Management
- **View All Logs**: Browse all saved QSOs with full details
- **Delete Individual Entries**: Remove specific logs
- **Clear All**: Bulk delete all internal logs
- **Pull to Refresh**: Update log list
- **Color-Coded Reasons**: Visual indicators for why each QSO was saved locally

## How to Use

### Accessing Internal Logs
1. Open the app
2. Tap the **Settings** button (⚙️) in the top right
3. Scroll to the **Internal Logs** section
4. Tap **View Internal Logs**

### Viewing Logs
The internal logs screen shows:
- Each QSO as a card with all details
- Color-coded left border indicating save reason:
  - 🟡 Orange: Relay unavailable
  - 🔴 Red: HRD error
  - 🟢 Green: Manual save
- Timestamp and relative time (e.g., "5 minutes ago")
- Option to delete individual entries

### Exporting Logs

#### Export as CSV
1. In the Internal Logs screen, tap **Export CSV**
2. Choose where to save or share the file
3. The file name will be `pota_logs_YYYY-MM-DD.csv`

#### Export as ADIF
1. In the Internal Logs screen, tap **Export ADIF**
2. Choose where to save or share the file
3. The file name will be `pota_logs_YYYY-MM-DD.adi`
4. Import this file into your logging software

### Clearing Logs
1. In the Internal Logs screen, tap **Clear All**
2. Confirm the deletion
3. **Warning**: This cannot be undone! Export your logs first if you need them.

## How It Works

### When Logging a QSO

The app follows this workflow:

1. **HRD Enabled**: Tries to log to HRD via the relay
   - **Success**: Logs to HRD AND saves to internal log (backup)
   - **Failure**: Saves to internal log with error details

2. **HRD Disabled**: Saves directly to internal log
   - User is notified that HRD is disabled
   - QSO is safely stored locally

3. **Re-Spotting**: If you include a comment, the app will also:
   - Attempt to re-spot the activator on POTA
   - Include re-spot status in the confirmation message

### Data Storage

- Logs are stored locally on your device using React Native AsyncStorage
- Data persists between app sessions
- No internet connection required to save or view logs
- Logs are stored until you manually delete them

### Export Format Details

#### CSV Format
```
Timestamp,My Callsign,Their Callsign,Park Reference,Park Name,Frequency (kHz),Mode,RST Sent,RST Received,Comment,Location,Saved Reason
2024-12-13T15:30:00.000Z,W1ABC,K4XYZ,K-0001,Yellowstone National Park,14250.0,SSB,59,59,Strong signal,Wyoming US-WY,relay-unavailable
```

#### ADIF Format
```
ADIF Export from POTA Hunter
<ADIF_VER:5>3.1.4
<PROGRAMID:11>POTA Hunter
<PROGRAMVERSION:5>1.0.0
<EOH>

<QSO_DATE:8>20241213 <TIME_ON:6>153000 <CALL:5>K4XYZ <FREQ:8>14.25000 <BAND:3>20m <MODE:3>SSB <RST_SENT:2>59 <RST_RCVD:2>59 <STATION_CALLSIGN:5>W1ABC <SIG:4>POTA <SIG_INFO:6>K-0001 <COMMENT:13>Strong signal <EOR>
```

## Installation

The internal logging feature requires two additional Expo packages:

```bash
npm install expo-file-system@~19.0.21 expo-sharing@~14.0.8
```

Or if using yarn:

```bash
yarn add expo-file-system@~19.0.21 expo-sharing@~14.0.8
```

These packages provide:
- `expo-file-system` (v19.0.21): Create and write export files
- `expo-sharing` (v14.0.8): Share/export files to other apps

## Technical Details

### Storage Location
- AsyncStorage key: `@pota_hunter:internal_logs`
- Data format: JSON array of log entries
- Maximum size: Limited only by device storage

### Log Entry Structure
```typescript
interface InternalLogEntry {
  id: string;                    // Unique identifier
  timestamp: string;              // ISO 8601 timestamp
  callsign: string;               // Their callsign
  parkReference: string;          // Park reference (e.g., K-0001)
  frequency: string;              // Frequency in kHz
  mode: string;                   // Operating mode
  rstSent: string;               // Signal report sent
  rstReceived: string;           // Signal report received
  comment?: string;              // Optional comment
  myCallsign?: string;           // Your callsign
  parkName?: string;             // Park name
  locationDesc?: string;         // Park location
  savedReason: 'relay-unavailable' | 'hrd-error' | 'manual';
}
```

### Band Detection
The ADIF export automatically determines the band from frequency:
- 160m: 1.8-2.0 MHz
- 80m: 3.5-4.0 MHz
- 40m: 7.0-7.3 MHz
- 30m: 10.1-10.15 MHz
- 20m: 14.0-14.35 MHz
- 17m: 18.068-18.168 MHz
- 15m: 21.0-21.45 MHz
- 12m: 24.89-24.99 MHz
- 10m: 28.0-29.7 MHz
- 6m: 50-54 MHz
- 2m: 144-148 MHz

## Troubleshooting

### Logs Not Saving
- Check that you have storage permissions
- Ensure AsyncStorage is working (check app console for errors)
- Try restarting the app

### Export Not Working
- Verify `expo-file-system` and `expo-sharing` are installed
- On iOS, sharing requires proper permissions
- On Android, may need storage permissions

### Missing Data in Exports
- Ensure "My Callsign" is set in Settings
- Some fields are optional (park name, location, comment)
- Check that the log entry has all required data

## Future Enhancements

Potential future features:
- Sync logs with cloud storage
- Import logs from ADIF files
- Edit log entries before export
- Statistics and analysis dashboard
- Auto-upload to QRZ/LoTW when online
- Merge with HRD logbook when relay becomes available

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the app console for error messages
3. Ensure all dependencies are properly installed
4. Verify Settings > HRD settings are correct

---

**Note**: The internal logging feature is designed as a backup and convenience tool. For permanent logging and awards tracking, it's recommended to import the ADIF file into your primary logging software (HRD, Log4OM, etc.) when possible.
