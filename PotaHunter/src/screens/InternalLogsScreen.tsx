import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  InternalLogEntry,
  getInternalLogs,
  deleteLogEntry,
  clearInternalLogs,
  exportLogsAsCSV,
  exportLogsAsADIF,
} from '../services/internalLogService';
import { formatFrequency, getBand, getTimeAgo } from '../types/spot';

interface InternalLogsScreenProps {
  onBack: () => void;
}

export const InternalLogsScreen: React.FC<InternalLogsScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<InternalLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      const data = await getInternalLogs();
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
      Alert.alert('Error', 'Failed to load internal logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLogs(true);
  }, []);

  const handleDelete = (log: InternalLogEntry) => {
    Alert.alert(
      'Delete Log Entry',
      `Delete QSO with ${log.callsign}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteLogEntry(log.id);
            if (success) {
              loadLogs();
            } else {
              Alert.alert('Error', 'Failed to delete log entry');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (logs.length === 0) {
      Alert.alert('No Logs', 'There are no logs to clear');
      return;
    }

    Alert.alert(
      'Clear All Logs',
      `Delete all ${logs.length} log entries? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const success = await clearInternalLogs();
            if (success) {
              loadLogs();
              Alert.alert('Success', 'All logs cleared');
            } else {
              Alert.alert('Error', 'Failed to clear logs');
            }
          },
        },
      ]
    );
  };

  const handleExportCSV = async () => {
    if (logs.length === 0) {
      Alert.alert('No Logs', 'There are no logs to export');
      return;
    }

    const result = await exportLogsAsCSV();
    if (result.success) {
      // Success message is shown via the share dialog
    } else {
      Alert.alert('Export Failed', result.message);
    }
  };

  const handleExportADIF = async () => {
    if (logs.length === 0) {
      Alert.alert('No Logs', 'There are no logs to export');
      return;
    }

    const result = await exportLogsAsADIF();
    if (result.success) {
      // Success message is shown via the share dialog
    } else {
      Alert.alert('Export Failed', result.message);
    }
  };

  const getSavedReasonColor = (reason: string) => {
    switch (reason) {
      case 'relay-unavailable':
        return theme.warning || '#FF9800';
      case 'hrd-error':
        return theme.error;
      case 'manual':
        return theme.success;
      default:
        return theme.textSecondary;
    }
  };

  const getSavedReasonText = (reason: string) => {
    switch (reason) {
      case 'relay-unavailable':
        return 'Relay Unavailable';
      case 'hrd-error':
        return 'HRD Error';
      case 'manual':
        return 'Manual Save';
      default:
        return reason;
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
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    backText: {
      fontSize: 24,
      color: theme.textOnPrimary,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.textOnPrimary,
      flex: 1,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textOnPrimary,
      opacity: 0.9,
      marginLeft: 48,
    },
    logCount: {
      fontSize: 12,
      color: theme.textOnPrimary,
      opacity: 0.8,
      marginTop: 2,
      marginLeft: 48,
    },
    buttonContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 8,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    button: {
      flex: 1,
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    clearButton: {
      backgroundColor: theme.error,
    },
    buttonText: {
      color: theme.textOnPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    listContent: {
      paddingVertical: 8,
    },
    logCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderLeftWidth: 4,
    },
    logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    callsignContainer: {
      flex: 1,
    },
    callsign: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    parkReference: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
      marginTop: 2,
    },
    reasonBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    reasonText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textOnPrimary,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    infoLabel: {
      fontSize: 13,
      color: theme.textSecondary,
      width: 80,
    },
    infoValue: {
      fontSize: 13,
      color: theme.text,
      flex: 1,
      fontWeight: '500',
    },
    parkName: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 8,
      fontStyle: 'italic',
    },
    commentContainer: {
      backgroundColor: theme.surfaceVariant,
      padding: 10,
      borderRadius: 8,
      marginTop: 8,
    },
    commentText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontStyle: 'italic',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    timestamp: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    deleteButton: {
      backgroundColor: theme.error,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    deleteText: {
      color: theme.textOnPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
  });

  const renderLogItem = ({ item }: { item: InternalLogEntry }) => {
    const band = getBand(item.frequency);
    const timestamp = new Date(item.timestamp);
    const timeAgo = getTimeAgo(item.timestamp);
    const reasonColor = getSavedReasonColor(item.savedReason);
    const reasonText = getSavedReasonText(item.savedReason);

    return (
      <View style={[styles.logCard, { borderLeftColor: reasonColor }]}>
        <View style={styles.logHeader}>
          <View style={styles.callsignContainer}>
            <Text style={styles.callsign}>{item.callsign}</Text>
            <Text style={styles.parkReference}>{item.parkReference}</Text>
          </View>
          <View style={[styles.reasonBadge, { backgroundColor: reasonColor }]}>
            <Text style={styles.reasonText}>{reasonText}</Text>
          </View>
        </View>

        {item.parkName && (
          <Text style={styles.parkName}>{item.parkName}</Text>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>My Call:</Text>
          <Text style={styles.infoValue}>{item.myCallsign || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Frequency:</Text>
          <Text style={styles.infoValue}>
            {formatFrequency(item.frequency)} {band && `(${band})`}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mode:</Text>
          <Text style={styles.infoValue}>{item.mode}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>RST:</Text>
          <Text style={styles.infoValue}>
            Sent: {item.rstSent} / Rcvd: {item.rstReceived}
          </Text>
        </View>

        {item.locationDesc && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{item.locationDesc}</Text>
          </View>
        )}

        {item.comment && (
          <View style={styles.commentContainer}>
            <Text style={styles.commentText}>{item.comment}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.timestamp}>
            {timestamp.toLocaleDateString()} {timestamp.toLocaleTimeString()} ({timeAgo})
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Internal Logs</Text>
        </View>
        <Text style={styles.headerSubtitle}>QSOs saved locally</Text>
        {logs.length > 0 && (
          <Text style={styles.logCount}>{logs.length} log entries</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleExportCSV}
          disabled={logs.length === 0}
        >
          <Text style={styles.buttonText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={handleExportADIF}
          disabled={logs.length === 0}
        >
          <Text style={styles.buttonText}>Export ADIF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearAll}
          disabled={logs.length === 0}
        >
          <Text style={styles.buttonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading logs...</Text>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No internal logs yet</Text>
          <Text style={styles.emptySubtext}>
            QSOs will be saved here when the HRD relay is unavailable
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};
