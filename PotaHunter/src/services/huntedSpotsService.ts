import AsyncStorage from '@react-native-async-storage/async-storage';

const HUNTED_SPOTS_KEY = '@pota_hunter:hunted_spots';

/**
 * Interface for a hunted spot entry
 */
export interface HuntedSpot {
  spotId: number;
  callsign: string;
  parkReference: string;
  timestamp: string; // ISO 8601 timestamp when logged
}

/**
 * Get all hunted spots
 */
export const getHuntedSpots = async (): Promise<HuntedSpot[]> => {
  try {
    const data = await AsyncStorage.getItem(HUNTED_SPOTS_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data) as HuntedSpot[];
  } catch (error) {
    console.error('Error reading hunted spots:', error);
    return [];
  }
};

/**
 * Mark a spot as hunted
 */
export const markSpotAsHunted = async (
  spotId: number,
  callsign: string,
  parkReference: string
): Promise<boolean> => {
  try {
    const existing = await getHuntedSpots();
    
    // Check if already marked
    if (existing.some(spot => spot.spotId === spotId)) {
      return true;
    }

    const newSpot: HuntedSpot = {
      spotId,
      callsign,
      parkReference,
      timestamp: new Date().toISOString(),
    };

    const updated = [...existing, newSpot];
    await AsyncStorage.setItem(HUNTED_SPOTS_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Error marking spot as hunted:', error);
    return false;
  }
};

/**
 * Check if a spot is hunted
 */
export const isSpotHunted = async (spotId: number): Promise<boolean> => {
  try {
    const hunted = await getHuntedSpots();
    return hunted.some(spot => spot.spotId === spotId);
  } catch (error) {
    console.error('Error checking if spot is hunted:', error);
    return false;
  }
};

/**
 * Get hunted spot IDs as a Set for efficient lookup
 */
export const getHuntedSpotIds = async (): Promise<Set<number>> => {
  try {
    const hunted = await getHuntedSpots();
    return new Set(hunted.map(spot => spot.spotId));
  } catch (error) {
    console.error('Error getting hunted spot IDs:', error);
    return new Set();
  }
};

/**
 * Remove a spot from hunted list
 */
export const unmarkSpotAsHunted = async (spotId: number): Promise<boolean> => {
  try {
    const existing = await getHuntedSpots();
    const filtered = existing.filter(spot => spot.spotId !== spotId);
    await AsyncStorage.setItem(HUNTED_SPOTS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error unmarking spot as hunted:', error);
    return false;
  }
};

/**
 * Clear all hunted spots
 */
export const clearHuntedSpots = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(HUNTED_SPOTS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing hunted spots:', error);
    return false;
  }
};

/**
 * Clean up old hunted spots (older than specified days)
 */
export const cleanupOldHuntedSpots = async (daysToKeep: number = 30): Promise<number> => {
  try {
    const hunted = await getHuntedSpots();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const filtered = hunted.filter(spot => {
      const spotDate = new Date(spot.timestamp);
      return spotDate >= cutoffDate;
    });

    const removedCount = hunted.length - filtered.length;
    
    if (removedCount > 0) {
      await AsyncStorage.setItem(HUNTED_SPOTS_KEY, JSON.stringify(filtered));
    }

    return removedCount;
  } catch (error) {
    console.error('Error cleaning up old hunted spots:', error);
    return 0;
  }
};
