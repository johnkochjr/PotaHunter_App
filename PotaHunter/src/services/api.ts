import { Spot, SpotWithUserData } from '../types/spot';

const POTA_API_BASE = 'https://api.pota.app';

// Fetch active spots from POTA API
export const fetchActiveSpots = async (): Promise<Spot[]> => {
  try {
    const response = await fetch(`${POTA_API_BASE}/spot/activator`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: Spot[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching spots:', error);
    throw error;
  }
};

// Transform spots to include user data (hunted status)
// For now, this is a placeholder - you can implement local storage later
export const enrichSpotsWithUserData = (
  spots: Spot[],
  huntedParks: Set<string> = new Set()
): SpotWithUserData[] => {
  return spots.map(spot => ({
    ...spot,
    isHunted: huntedParks.has(spot.reference),
  }));
};

// Fetch spots with user data
export const fetchSpotsWithUserData = async (
  huntedParks: Set<string> = new Set()
): Promise<SpotWithUserData[]> => {
  const spots = await fetchActiveSpots();
  return enrichSpotsWithUserData(spots, huntedParks);
};
