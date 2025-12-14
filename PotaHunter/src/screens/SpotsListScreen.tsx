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
import { saveToInternalLog } from '../services/internalLogService';
import { markSpotAsHunted, getHuntedSpotIds } from '../services/huntedSpotsService';

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
  const [hideHunted, setHideHunted] = useState<boolean>(false);

  // Log modal state
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [spotToLog, setSpotToLog] = useState<SpotWithUserData | null>(null);

  // Hunted spots tracking
  const [huntedSpotIds, setHuntedSpotIds] = useState<Set<number>>(new Set());

  // Mock hunted parks - in real app, load from storage
  const [huntedParks] = useState<Set<string>>(
    new Set(['US-0052', 'US-4178', 'K-0001']) // Example hunted parks
  );

  // Filter spots based on selected filters
  const filteredSpots = useMemo(() => {
    return spots.filter(spot => {
      // Hide hunted filter
      if (hideHunted && huntedSpotIds.has(spot.spotId)) {
        return false;
      }

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
  }, [spots, bandFilter, modeFilter, hideHunted, huntedSpotIds]);

  const loadSpots = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      const data = await fetchSpotsWithUserData(huntedParks);
      setSpots(data);

      // Load hunted spot IDs
      const hunted = await getHuntedSpotIds();
      setHuntedSpotIds(hunted);
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
    let loggedToHRD = false;
    let hrdErrorMessage = '';

    // Try to log to HRD if enabled
    if (hrdSettings.enabled) {
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
        loggedToHRD = true;
      } else {
        hrdErrorMessage = result.message;
      }
    }

    // Save to internal log as backup or if HRD failed
    const internalLogResult = await saveToInternalLog({
      callsign: qsoData.callsign,
      parkReference: qsoData.parkReference,
      frequency: qsoData.frequency,
      mode: qsoData.mode,
      rstSent: qsoData.rstSent,
      rstReceived: qsoData.rstReceived,
      comment: qsoData.comment,
      myCallsign: hrdSettings.myCallsign,
      parkName: spotToLog?.name,
      locationDesc: spotToLog?.locationDesc,
      savedReason: !hrdSettings.enabled 
        ? 'relay-unavailable' 
        : loggedToHRD 
          ? 'manual' 
          : 'hrd-error',
    });

    // Handle re-spot if comment was provided
    let reSpotMessage = '';
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
        reSpotMessage = reSpotResult.message;
      }
    }

    // Show appropriate message based on what succeeded
    if (loggedToHRD && internalLogResult.success) {
      const messages = [`QSO logged to HRD and saved locally`];
      if (reSpotMessage) {
        messages.push(reSpotMessage);
      }
      Alert.alert('QSO Logged', messages.join('\n\n'));
    } else if (loggedToHRD && !internalLogResult.success) {
      Alert.alert('QSO Logged to HRD', `Logged to HRD but local save failed.\n\n${reSpotMessage || ''}`);
    } else if (!loggedToHRD && internalLogResult.success) {
      const messages = [
        hrdSettings.enabled 
          ? `HRD unavailable: ${hrdErrorMessage}\n\nQSO saved to internal log for later export.` 
          : 'QSO saved to internal log.\n\nEnable HRD in settings to log directly to your radio.'
      ];
      if (reSpotMessage) {
        messages.push(reSpotMessage);
      }
      Alert.alert('Saved to Internal Log', messages.join('\n\n'));
    } else {
      // Both failed
      const errorMsg = [
        hrdSettings.enabled ? `HRD Error: ${hrdErrorMessage}` : 'HRD is disabled',
        `Internal log error: ${internalLogResult.message}`
      ].join('\n\n');
      
      Alert.alert('Log Failed', errorMsg, [
        { text: 'OK' },
        { text: 'Settings', onPress: onOpenSettings },
      ]);
      throw new Error('Both HRD and internal log failed');
    }

    // Mark spot as hunted
    if (spotToLog) {
      await markSpotAsHunted(spotToLog.spotId, spotToLog.activator, spotToLog.reference);
      setHuntedSpotIds(prev => new Set([...prev, spotToLog.spotId]));
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
        hideHunted={hideHunted}
        onHideHuntedChange={setHideHunted}
        resultCount={filteredSpots.length}
      />
      <FlatList
        data={filteredSpots}
        keyExtractor={(item) => item.spotId.toString()}
        renderItem={({ item }) => (
          <SpotCard
            spot={item}
            isHunted={huntedSpotIds.has(item.spotId)}
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
