# Installation Guide - Internal Logging Feature

## Prerequisites
- Node.js and npm (or yarn) installed
- Expo CLI installed
- Existing POTA Hunter app set up

## Installation Steps

### 1. Navigate to the PotaHunter directory
```bash
cd /Users/johnkoch/repos/PotaHunter_App/PotaHunter
```

### 2. Install required dependencies
```bash
npm install expo-file-system expo-sharing
```

Or if using yarn:
```bash
yarn add expo-file-system expo-sharing
```

### 3. Clear any cached build files (recommended)
```bash
npm start -- --clear
```

Or:
```bash
expo start -c
```

### 4. Verify installation
Run the app and check that there are no import errors:
```bash
npm start
```

## What Was Installed

### expo-file-system (~19.0.21)
Provides file system access for creating and writing export files.

**Used for:**
- Creating CSV export files
- Creating ADIF export files
- Writing log data to files
- Managing temporary export files

### expo-sharing (~14.0.8)
Provides the ability to share files with other apps.

**Used for:**
- Sharing exported CSV files
- Sharing exported ADIF files
- Opening files in other apps (email, drive, etc.)
- Cross-platform file sharing

## Testing the Installation

### 1. Start the app
```bash
cd PotaHunter
npm start
```

### 2. Test internal logging
1. Open the app on your device/emulator
2. Disable HRD in Settings (or ensure relay is not running)
3. Tap a spot and click "LOG"
4. Fill in the QSO details and submit
5. You should see: "Saved to Internal Log"

### 3. Test log viewing
1. Go to Settings (⚙️ button)
2. Scroll to "Internal Logs"
3. Tap "View Internal Logs"
4. You should see your saved QSO

### 4. Test CSV export
1. In Internal Logs screen, tap "Export CSV"
2. Choose where to save/share
3. Verify the CSV file is created

### 5. Test ADIF export
1. In Internal Logs screen, tap "Export ADIF"
2. Choose where to save/share
3. Verify the ADIF file is created
4. (Optional) Import into Ham Radio Deluxe or other logging software

## Troubleshooting

### Issue: Module not found errors
**Solution:** Ensure you ran `npm install` in the correct directory (PotaHunter, not PotaHunter_App)

```bash
cd /Users/johnkoch/repos/PotaHunter_App/PotaHunter
npm install
```

### Issue: TypeScript errors about missing types
**Solution:** Clear cache and rebuild:
```bash
expo start -c
```

### Issue: Export not working on iOS
**Solution:** Ensure sharing is available:
- Check that `expo-sharing` is properly installed
- Verify app has necessary permissions
- Try restarting the app

### Issue: Export not working on Android
**Solution:** May need storage permissions:
- Grant storage permissions in device settings
- On Android 11+, use the share dialog instead of direct file access

### Issue: AsyncStorage errors
**Solution:** The package is already in package.json, but if there are issues:
```bash
npm install @react-native-async-storage/async-storage
```

## Platform-Specific Notes

### iOS
- File sharing works via the native share sheet
- Files are saved to the app's document directory
- Can share to Mail, Messages, Files app, etc.

### Android
- Uses Android's share intent
- Files saved to app-specific directory
- Can share to Gmail, Drive, other apps

### Web (if running with `expo start --web`)
- File system operations may have limitations
- Sharing uses browser download mechanism
- Some features may not work identically to native

## Verification Checklist

After installation, verify:
- [ ] No import errors in console
- [ ] App starts successfully
- [ ] Can navigate to Internal Logs screen
- [ ] Can save a QSO to internal log
- [ ] Can view saved logs
- [ ] Can export as CSV
- [ ] Can export as ADIF
- [ ] Can delete individual logs
- [ ] Can clear all logs

## Next Steps

Once installed and verified:
1. Read `/INTERNAL_LOGGING.md` for complete feature documentation
2. Test with real QSO data
3. Try importing ADIF file into your logging software
4. Configure HRD settings for full functionality

## Support Files Created

Reference these files for more information:
- `/INTERNAL_LOGGING.md` - Complete feature documentation
- `/IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- This file (`INSTALL.md`) - Installation instructions

## Rollback (if needed)

To remove the internal logging feature:

1. Remove the dependencies:
```bash
npm uninstall expo-file-system expo-sharing
```

2. Delete the new files:
- `src/services/internalLogService.ts`
- `src/screens/InternalLogsScreen.tsx`

3. Revert changes to:
- `App.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/screens/SpotsListScreen.tsx`
- `package.json`

(Use git to revert if the project is in version control)

---

**Installation Complete!** The internal logging feature is now ready to use.
