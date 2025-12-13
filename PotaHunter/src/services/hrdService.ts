import { HRDSettings } from '../context/SettingsContext';

// HRD Relay HTTP API
// The relay server accepts HTTP requests and forwards to HRD's TCP interface

export interface HRDResponse {
  success: boolean;
  message: string;
}

// Convert frequency from kHz (API format) to Hz (HRD format)
export const kHzToHz = (kHz: string): number => {
  const freq = parseFloat(kHz);
  return Math.round(freq * 1000);
};

// Map spot mode to HRD mode string
export const mapModeToHRD = (mode: string): string => {
  const upperMode = mode.toUpperCase();

  // Common mode mappings
  if (upperMode.includes('SSB')) {
    // Determine USB or LSB based on frequency (below 10MHz = LSB, above = USB)
    // This will be refined based on actual frequency
    return 'USB';
  }
  if (upperMode === 'USB') return 'USB';
  if (upperMode === 'LSB') return 'LSB';
  if (upperMode === 'CW') return 'CW';
  if (upperMode === 'CW-R' || upperMode === 'CWR') return 'CW-R';
  if (upperMode === 'AM') return 'AM';
  if (upperMode === 'FM') return 'FM';
  if (upperMode === 'RTTY') return 'RTTY';
  if (upperMode === 'RTTY-R' || upperMode === 'RTTYR') return 'RTTY-R';
  if (upperMode.includes('FT8') || upperMode.includes('FT4') ||
      upperMode.includes('PSK') || upperMode.includes('DIGI')) {
    return 'USB-D'; // Digital modes typically use USB-D or DATA-U
  }

  return upperMode;
};

// Determine if frequency should use LSB (below 10 MHz for SSB)
export const shouldUseLSB = (freqKHz: string): boolean => {
  const freq = parseFloat(freqKHz);
  return freq < 10000; // Below 10 MHz
};

// Send frequency and mode to HRD via the relay server
export const sendToHRD = async (
  settings: HRDSettings,
  frequencyKHz: string,
  mode: string
): Promise<HRDResponse> => {
  if (!settings.enabled) {
    return { success: false, message: 'HRD connection is disabled' };
  }

  const freqHz = kHzToHz(frequencyKHz);
  let hrdMode = mapModeToHRD(mode);

  // Adjust SSB mode based on frequency
  if (hrdMode === 'USB' && mode.toUpperCase().includes('SSB') && shouldUseLSB(frequencyKHz)) {
    hrdMode = 'LSB';
  }

  try {
    const relayUrl = `http://${settings.ipAddress}:${settings.port}/frequency`;

    console.log(`Sending to relay: ${relayUrl}`);
    console.log(`Frequency: ${freqHz} Hz, Mode: ${hrdMode}`);

    const response = await fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frequency: freqHz,
        mode: hrdMode,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: data.message || `Tuned to ${(freqHz / 1000000).toFixed(6)} MHz ${hrdMode}`,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to tune radio',
      };
    }
  } catch (error) {
    console.error('HRD relay error:', error);

    // Provide helpful error message
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        message: 'Cannot reach HRD Relay. Is it running?',
      };
    }

    return {
      success: false,
      message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

// Test connection to HRD via relay
export const testHRDConnection = async (settings: HRDSettings): Promise<HRDResponse> => {
  try {
    const relayUrl = `http://${settings.ipAddress}:${settings.port}/test`;

    const response = await fetch(relayUrl, {
      method: 'GET',
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: `Connected! Current freq: ${data.frequency || 'unknown'}`,
      };
    } else {
      return {
        success: false,
        message: data.message || 'HRD not responding',
      };
    }
  } catch (error) {
    console.error('HRD test error:', error);

    return {
      success: false,
      message: 'Cannot reach HRD Relay server. Make sure relay.js is running.',
    };
  }
};

// Log QSO to HRD Logbook via relay
export interface QSOLogData {
  callsign: string;
  frequency: string;  // in kHz
  mode: string;
  rstSent: string;
  rstReceived: string;
  comment?: string;
  parkReference?: string;
  myCallsign?: string;
}

export const logQSOToHRD = async (
  settings: HRDSettings,
  qsoData: QSOLogData
): Promise<HRDResponse> => {
  if (!settings.enabled) {
    return { success: false, message: 'HRD connection is disabled' };
  }

  try {
    const relayUrl = `http://${settings.ipAddress}:${settings.port}/log`;

    console.log(`Logging QSO to relay: ${relayUrl}`);
    console.log(`QSO Data:`, qsoData);

    const response = await fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(qsoData),
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: data.message || `QSO logged: ${qsoData.callsign}`,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to log QSO',
      };
    }
  } catch (error) {
    console.error('HRD log error:', error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        message: 'Cannot reach HRD Relay. Is it running?',
      };
    }

    return {
      success: false,
      message: `Log error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

// Check if relay server is running (health check)
export const checkRelayHealth = async (settings: HRDSettings): Promise<HRDResponse> => {
  try {
    const relayUrl = `http://${settings.ipAddress}:${settings.port}/health`;

    const response = await fetch(relayUrl, {
      method: 'GET',
    });

    const data = await response.json();

    return {
      success: data.status === 'ok',
      message: data.status === 'ok' ? 'Relay server is running' : 'Relay server error',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Relay server not reachable',
    };
  }
};
