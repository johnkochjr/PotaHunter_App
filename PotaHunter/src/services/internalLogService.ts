import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Internal log entry type
export interface InternalLogEntry {
  id: string;
  timestamp: string; // ISO 8601 timestamp
  callsign: string;
  parkReference: string;
  frequency: string; // in kHz
  mode: string;
  rstSent: string;
  rstReceived: string;
  comment?: string;
  myCallsign?: string;
  parkName?: string;
  locationDesc?: string;
  // Additional metadata
  savedReason: 'relay-unavailable' | 'hrd-error' | 'manual';
}

const STORAGE_KEY = '@pota_hunter:internal_logs';

/**
 * Save a QSO to the internal log
 */
export const saveToInternalLog = async (
  entry: Omit<InternalLogEntry, 'id' | 'timestamp'>
): Promise<{ success: boolean; message: string }> => {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const newEntry: InternalLogEntry = {
      id,
      timestamp,
      ...entry,
    };

    // Get existing logs
    const existing = await getInternalLogs();
    const updated = [newEntry, ...existing];

    // Save to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return {
      success: true,
      message: `QSO saved to internal log (${updated.length} total)`,
    };
  } catch (error) {
    console.error('Error saving to internal log:', error);
    return {
      success: false,
      message: `Failed to save to internal log: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Get all internal log entries
 */
export const getInternalLogs = async (): Promise<InternalLogEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data) as InternalLogEntry[];
  } catch (error) {
    console.error('Error reading internal logs:', error);
    return [];
  }
};

/**
 * Delete a specific log entry by ID
 */
export const deleteLogEntry = async (id: string): Promise<boolean> => {
  try {
    const logs = await getInternalLogs();
    const filtered = logs.filter(log => log.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting log entry:', error);
    return false;
  }
};

/**
 * Clear all internal logs
 */
export const clearInternalLogs = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing internal logs:', error);
    return false;
  }
};

/**
 * Export logs as CSV file
 */
export const exportLogsAsCSV = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const logs = await getInternalLogs();

    if (logs.length === 0) {
      return {
        success: false,
        message: 'No logs to export',
      };
    }

    // Build CSV content
    const headers = [
      'Timestamp',
      'My Callsign',
      'Their Callsign',
      'Park Reference',
      'Park Name',
      'Frequency (kHz)',
      'Mode',
      'RST Sent',
      'RST Received',
      'Comment',
      'Location',
      'Saved Reason',
    ].join(',');

    const rows = logs.map(log => {
      const formatCSVField = (field: string | undefined) => {
        if (!field) return '';
        // Escape quotes and wrap in quotes if contains comma or quote
        const escaped = field.replace(/"/g, '""');
        return escaped.indexOf(',') !== -1 || escaped.indexOf('"') !== -1 || escaped.indexOf('\n') !== -1
          ? `"${escaped}"`
          : escaped;
      };

      return [
        formatCSVField(log.timestamp),
        formatCSVField(log.myCallsign),
        formatCSVField(log.callsign),
        formatCSVField(log.parkReference),
        formatCSVField(log.parkName),
        formatCSVField(log.frequency),
        formatCSVField(log.mode),
        formatCSVField(log.rstSent),
        formatCSVField(log.rstReceived),
        formatCSVField(log.comment),
        formatCSVField(log.locationDesc),
        formatCSVField(log.savedReason),
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');

    // Save to file
    const fileName = `pota_logs_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Export POTA Logs',
        UTI: 'public.comma-separated-values-text',
      });

      return {
        success: true,
        message: `Exported ${logs.length} logs to ${fileName}`,
      };
    } else {
      return {
        success: false,
        message: 'Sharing is not available on this device',
      };
    }
  } catch (error) {
    console.error('Error exporting logs:', error);
    return {
      success: false,
      message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Export logs as ADIF file (Amateur Data Interchange Format)
 * Standard format for ham radio logging
 */
export const exportLogsAsADIF = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const logs = await getInternalLogs();

    if (logs.length === 0) {
      return {
        success: false,
        message: 'No logs to export',
      };
    }

    // Build ADIF content
    const header = `ADIF Export from POTA Hunter
<ADIF_VER:5>3.1.4
<PROGRAMID:11>POTA Hunter
<PROGRAMVERSION:5>1.0.0
<EOH>

`;

    const adifRecords = logs.map(log => {
      // Parse timestamp
      const date = new Date(log.timestamp);
      const qsoDate = date.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
      const qsoTime = date.toISOString().split('T')[1].split('.')[0].replace(/:/g, ''); // HHMMSS

      // Convert frequency from kHz to MHz for ADIF
      const freqMHz = (parseFloat(log.frequency) / 1000).toFixed(6);

      // Determine band from frequency
      const getBandFromFreq = (freqKHz: string): string => {
        const freq = parseFloat(freqKHz);
        if (freq >= 1800 && freq < 2000) return '160m';
        if (freq >= 3500 && freq < 4000) return '80m';
        if (freq >= 7000 && freq < 7300) return '40m';
        if (freq >= 10100 && freq < 10150) return '30m';
        if (freq >= 14000 && freq < 14350) return '20m';
        if (freq >= 18068 && freq < 18168) return '17m';
        if (freq >= 21000 && freq < 21450) return '15m';
        if (freq >= 24890 && freq < 24990) return '12m';
        if (freq >= 28000 && freq < 29700) return '10m';
        if (freq >= 50000 && freq < 54000) return '6m';
        if (freq >= 144000 && freq < 148000) return '2m';
        return '';
      };

      const band = getBandFromFreq(log.frequency);

      let record = '';
      record += `<QSO_DATE:8>${qsoDate} `;
      record += `<TIME_ON:6>${qsoTime} `;
      record += `<CALL:${log.callsign.length}>${log.callsign} `;
      record += `<FREQ:${freqMHz.length}>${freqMHz} `;
      if (band) {
        record += `<BAND:${band.length}>${band} `;
      }
      record += `<MODE:${log.mode.length}>${log.mode} `;
      record += `<RST_SENT:${log.rstSent.length}>${log.rstSent} `;
      record += `<RST_RCVD:${log.rstReceived.length}>${log.rstReceived} `;

      if (log.myCallsign) {
        record += `<STATION_CALLSIGN:${log.myCallsign.length}>${log.myCallsign} `;
      }

      // POTA-specific fields
      if (log.parkReference) {
        record += `<SIG:4>POTA `;
        record += `<SIG_INFO:${log.parkReference.length}>${log.parkReference} `;
      }

      // Comment
      if (log.comment) {
        record += `<COMMENT:${log.comment.length}>${log.comment} `;
      }

      record += '<EOR>\n';
      return record;
    });

    const adif = header + adifRecords.join('\n');

    // Save to file
    const fileName = `pota_logs_${new Date().toISOString().split('T')[0]}.adi`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, adif, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/plain',
        dialogTitle: 'Export POTA Logs (ADIF)',
      });

      return {
        success: true,
        message: `Exported ${logs.length} logs to ${fileName}`,
      };
    } else {
      return {
        success: false,
        message: 'Sharing is not available on this device',
      };
    }
  } catch (error) {
    console.error('Error exporting ADIF logs:', error);
    return {
      success: false,
      message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Get count of internal logs
 */
export const getLogCount = async (): Promise<number> => {
  const logs = await getInternalLogs();
  return logs.length;
};
