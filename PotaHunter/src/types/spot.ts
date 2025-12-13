// Type definitions for POTA API spot data

export interface Spot {
  spotId: number;
  activator: string;
  frequency: string;
  mode: string;
  reference: string;
  parkName: string | null;
  spotTime: string;
  spotter: string;
  comments: string | null;
  source: string;
  name: string;
  locationDesc: string;
  grid4: string;
  grid6: string;
  latitude: number;
  longitude: number;
  count: number;
  expire: number;
  invalid: boolean | null;
}

// Extended spot with local user data
export interface SpotWithUserData extends Spot {
  isHunted: boolean;  // Whether the user has hunted this park
}

// Mode categories for filtering/display
export type ModeCategory = 'SSB' | 'CW' | 'FT8' | 'FT4' | 'Digital' | 'Other';

// Helper to categorize modes
export const getModeCategory = (mode: string): ModeCategory => {
  const upperMode = mode.toUpperCase();
  if (upperMode.includes('SSB') || upperMode === 'LSB' || upperMode === 'USB') {
    return 'SSB';
  }
  if (upperMode === 'CW') {
    return 'CW';
  }
  if (upperMode === 'FT8') {
    return 'FT8';
  }
  if (upperMode === 'FT4') {
    return 'FT4';
  }
  if (['RTTY', 'PSK', 'JS8', 'DIGI'].some(d => upperMode.includes(d))) {
    return 'Digital';
  }
  return 'Other';
};

// Helper to format frequency for display
export const formatFrequency = (freq: string): string => {
  const numFreq = parseFloat(freq);
  if (isNaN(numFreq)) return freq;

  // Convert kHz to MHz if over 1000
  if (numFreq >= 1000) {
    return `${(numFreq / 1000).toFixed(3)} MHz`;
  }
  return `${freq} kHz`;
};

// Helper to get band from frequency
export const getBand = (freq: string): string => {
  const numFreq = parseFloat(freq);
  if (isNaN(numFreq)) return '';

  // Frequency in kHz
  if (numFreq >= 1800 && numFreq <= 2000) return '160m';
  if (numFreq >= 3500 && numFreq <= 4000) return '80m';
  if (numFreq >= 5330 && numFreq <= 5410) return '60m';
  if (numFreq >= 7000 && numFreq <= 7300) return '40m';
  if (numFreq >= 10100 && numFreq <= 10150) return '30m';
  if (numFreq >= 14000 && numFreq <= 14350) return '20m';
  if (numFreq >= 18068 && numFreq <= 18168) return '17m';
  if (numFreq >= 21000 && numFreq <= 21450) return '15m';
  if (numFreq >= 24890 && numFreq <= 24990) return '12m';
  if (numFreq >= 28000 && numFreq <= 29700) return '10m';
  if (numFreq >= 50000 && numFreq <= 54000) return '6m';
  if (numFreq >= 144000 && numFreq <= 148000) return '2m';
  if (numFreq >= 420000 && numFreq <= 450000) return '70cm';

  return '';
};

// Helper to calculate time ago string
export const getTimeAgo = (spotTime: string): string => {
  const spotDate = new Date(spotTime);
  const now = new Date();
  const diffMs = now.getTime() - spotDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  return spotDate.toLocaleDateString();
};
