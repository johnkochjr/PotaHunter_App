import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { SpotCard } from '../components/SpotCard';
import { FilterBar } from '../components/FilterBar';
import { LogModal, QSOData } from '../components/LogModal';
import { SpotWithUserData, getBand, formatFrequency } from '../types/spot';
import { fetchSpotsWithUserData } from '../services/api';
import { sendToHRD, logQSOToHRD } from '../services/hrdService';
import { reSpotActivator } from '../services/potaService';

interface SpotsListScreenProps {
  onOpenSettings: () => void;
}

export const SpotsListScreen: React.FC<SpotsListScreenProps> = ({ onOpenSettings }) => {
  const { theme } = useTheme();
  const { hrdSettings } = useSettings();
  const [spots, setSpots] = useState<SpotWithUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [bandFilter, setBandFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

  // Log modal state
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [spotToLog, setSpotToLog] = useState<SpotWithUserData | null>(null);

  // Mock hunted parks - in real app, load from storage
  const [huntedParks] = useState<Set<string>>(
    new Set(['US-0052', 'US-4178', 'K-0001']) // Example hunted parks
  );

  // Filter spots based on selected filters
  const filteredSpots = useMemo(() => {
    return spots.filter(spot => {
      // Band filter
      if (bandFilter !== 'all') {
        const spotBand = getBand(spot.frequency);
        if (spotBand !== bandFilter) {
          return false;
        }
      }

      // Mode filter
      if (modeFilter !== 'all') {
        const spotMode = spot.mode.toUpperCase();
        const filterMode = modeFilter.toUpperCase();

        // Handle SSB matching (includes USB, LSB)
        if (filterMode === 'SSB') {
          if (!spotMode.includes('SSB') && spotMode !== 'USB' && spotMode !== 'LSB') {
            return false;
          }
        } else if (!spotMode.includes(filterMode)) {
          return false;
        }
      }

      return true;
    });
  }, [spots, bandFilter, modeFilter]);

  const loadSpots = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      const data = await fetchSpotsWithUserData(huntedParks);
      setSpots(data);
    } catch (err) {
      setError('Failed to load spots. Pull to refresh.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSpots();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSpots(true);
  }, [huntedParks]);

  const handleSpotPress = async (spot: SpotWithUserData) => {
    if (!hrdSettings.enabled) {
      Alert.alert(
        'HRD Not Enabled',
        'Enable Ham Radio Deluxe control in Settings to tune your radio.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: onOpenSettings },
        ]
      );
      return;
    }

    // Send frequency and mode to HRD
    const result = await sendToHRD(hrdSettings, spot.frequency, spot.mode);

    if (result.success) {
      Alert.alert('Radio Tuned', result.message);
    } else {
      Alert.alert('Tuning Failed', result.message, [
        { text: 'OK' },
        { text: 'Settings', onPress: onOpenSettings },
      ]);
    }
  };

  const handleReSpot = (spot: SpotWithUserData) => {
    // Implement re-spot functionality
    console.log('Re-spot:', spot.activator, spot.reference);
  };

  const handleLog = (spot: SpotWithUserData) => {
    setSpotToLog(spot);
    setLogModalVisible(true);
  };

  const handleLogSubmit = async (qsoData: QSOData) => {
    if (!hrdSettings.enabled) {
      Alert.alert(
        'HRD Not Enabled',
        'Enable Ham Radio Deluxe control in Settings to log QSOs.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: onOpenSettings },
        ]
      );
      return;
    }

    const result = await logQSOToHRD(hrdSettings, {
      callsign: qsoData.callsign,
      frequency: qsoData.frequency,
      mode: qsoData.mode,
      rstSent: qsoData.rstSent,
      rstReceived: qsoData.rstReceived,
      comment: qsoData.comment,
      parkReference: qsoData.parkReference,
      myCallsign: hrdSettings.myCallsign,
    });

    if (result.success) {
      // If a comment was provided, also submit a re-spot to POTA
      if (qsoData.comment.trim()) {
        const reSpotResult = await reSpotActivator(
          qsoData.callsign,
          qsoData.parkReference,
          qsoData.frequency,
          qsoData.mode,
          hrdSettings.myCallsign,
          qsoData.comment
        );

        if (reSpotResult.success) {
          Alert.alert('QSO Logged & Re-Spotted', `${result.message}\n\n${reSpotResult.message}`);
        } else {
          // QSO logged but re-spot failed
          Alert.alert(
            'QSO Logged',
            `${result.message}\n\nRe-spot failed: ${reSpotResult.message}`
          );
        }
      } else {
        Alert.alert('QSO Logged', result.message);
      }
    } else {
      Alert.alert('Log Failed', result.message, [
        { text: 'OK' },
        { text: 'Settings', onPress: onOpenSettings },
      ]);
      throw new Error(result.message);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.primary,
      padding: 16,
      paddingTop: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.textOnPrimary,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textOnPrimary,
      opacity: 0.9,
      marginTop: 4,
    },
    settingsButton: {
      padding: 8,
    },
    settingsText: {
      color: theme.textOnPrimary,
      fontSize: 24,
    },
    listContent: {
      paddingVertical: 8,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    errorText: {
      fontSize: 16,
      color: theme.error,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    spotCount: {
      fontSize: 12,
      color: theme.textOnPrimary,
      opacity: 0.8,
      marginTop: 2,
    },
    hrdStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    hrdDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    hrdText: {
      fontSize: 11,
      color: theme.textOnPrimary,
      opacity: 0.8,
    },
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Active Spots</Text>
        <Text style={styles.headerSubtitle}>Parks on the Air</Text>
        {spots.length > 0 && (
          <Text style={styles.spotCount}>{spots.length} active spots</Text>
        )}
        <View style={styles.hrdStatus}>
          <View
            style={[
              styles.hrdDot,
              { backgroundColor: hrdSettings.enabled ? '#4CAF50' : '#9E9E9E' },
            ]}
          />
          <Text style={styles.hrdText}>
            {hrdSettings.enabled ? 'HRD Connected' : 'HRD Disabled'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.settingsButton} onPress={onOpenSettings}>
        <Text style={styles.settingsText}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={theme.primary} barStyle="light-content" />
        {renderHeader()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading spots...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={theme.primary} barStyle="light-content" />
        {renderHeader()}
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />
      {renderHeader()}
      <FilterBar
        bandFilter={bandFilter}
        modeFilter={modeFilter}
        onBandChange={setBandFilter}
        onModeChange={setModeFilter}
        resultCount={filteredSpots.length}
      />
      <FlatList
        data={filteredSpots}
        keyExtractor={(item) => item.spotId.toString()}
        renderItem={({ item }) => (
          <SpotCard
            spot={item}
            onPress={handleSpotPress}
            onReSpot={handleReSpot}
            onLog={handleLog}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {bandFilter !== 'all' || modeFilter !== 'all'
                ? 'No spots match the selected filters'
                : 'No active spots at the moment'}
            </Text>
          </View>
        }
      />
      <LogModal
        visible={logModalVisible}
        spot={spotToLog}
        stationCallsign={hrdSettings.myCallsign}
        onClose={() => setLogModalVisible(false)}
        onSubmit={handleLogSubmit}
      />
    </SafeAreaView>
  );
};
