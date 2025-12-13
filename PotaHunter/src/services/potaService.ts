/**
 * POTA API Service
 *
 * Handles interactions with the Parks on the Air API
 * including spot submission (re-spotting activators)
 */

const POTA_API_BASE = 'https://api.pota.app';
const APP_VERSION = '1.0.0';

export interface SpotSubmission {
  activator: string;      // Activator's callsign
  spotter: string;        // Your callsign (the person spotting)
  frequency: string;      // Frequency in kHz
  reference: string;      // Park reference (e.g., K-0001)
  mode: string;           // Operating mode
  comments: string;       // Spot comment
}

export interface SpotResponse {
  success: boolean;
  message: string;
}

/**
 * Submit a spot (re-spot) to the POTA API
 *
 * Based on HunterLog implementation:
 * https://github.com/cwhelchel/hunterlog/blob/main/src/pota/pota.py
 */
export const submitSpot = async (spot: SpotSubmission): Promise<SpotResponse> => {
  try {
    console.log(`[POTA] Submitting spot for ${spot.activator} at ${spot.reference}`);

    const response = await fetch(`${POTA_API_BASE}/spot/`, {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'origin': 'https://pota.app',
        'referer': 'https://pota.app/',
        'user-agent': `PotaHunter/${APP_VERSION}`,
      },
      body: JSON.stringify({
        activator: spot.activator,
        spotter: spot.spotter,
        frequency: spot.frequency,
        reference: spot.reference,
        mode: spot.mode,
        source: 'PotaHunter',
        comments: spot.comments,
      }),
    });

    console.log(`[POTA] Response status: ${response.status}`);

    if (response.ok) {
      return {
        success: true,
        message: `Re-spotted ${spot.activator} at ${spot.reference}`,
      };
    } else {
      const errorText = await response.text();
      console.error(`[POTA] Error response: ${errorText}`);
      return {
        success: false,
        message: `Failed to submit spot: ${response.status}`,
      };
    }
  } catch (error) {
    console.error('[POTA] Spot submission error:', error);
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Re-spot an activator with a comment
 * Convenience wrapper that builds the SpotSubmission from common parameters
 */
export const reSpotActivator = async (
  activatorCall: string,
  parkReference: string,
  frequency: string,
  mode: string,
  spotterCall: string,
  comment: string
): Promise<SpotResponse> => {
  return submitSpot({
    activator: activatorCall,
    spotter: spotterCall,
    frequency: frequency,
    reference: parkReference,
    mode: mode,
    comments: comment,
  });
};
