import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SpotWithUserData, formatFrequency, getBand } from '../types/spot';

export interface QSOData {
  callsign: string;
  parkReference: string;
  frequency: string;
  mode: string;
  rstSent: string;
  rstReceived: string;
  comment: string;
}

interface LogModalProps {
  visible: boolean;
  spot: SpotWithUserData | null;
  stationCallsign: string;
  onClose: () => void;
  onSubmit: (qsoData: QSOData) => Promise<void>;
}

export const LogModal: React.FC<LogModalProps> = ({
  visible,
  spot,
  stationCallsign,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();

  const [callsign, setCallsign] = useState('');
  const [parkReference, setParkReference] = useState('');
  const [frequency, setFrequency] = useState('');
  const [mode, setMode] = useState('');
  const [rstSent, setRstSent] = useState('59');
  const [rstReceived, setRstReceived] = useState('59');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill from spot data when modal opens
  useEffect(() => {
    if (spot && visible) {
      setCallsign(spot.activator);
      setParkReference(spot.reference);
      setFrequency(spot.frequency);
      setMode(spot.mode);
      setRstSent('59');
      setRstReceived('59');
      setComment('');
    }
  }, [spot, visible]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        callsign,
        parkReference,
        frequency,
        mode,
        rstSent,
        rstReceived,
        comment,
      });
      onClose();
    } catch (error) {
      console.error('Failed to log QSO:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      width: '90%',
      maxWidth: 400,
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      backgroundColor: theme.primary,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.textOnPrimary,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textOnPrimary,
      textAlign: 'center',
      marginTop: 4,
      opacity: 0.9,
    },
    content: {
      padding: 20,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 6,
    },
    input: {
      backgroundColor: theme.surfaceVariant,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inputDisabled: {
      opacity: 0.7,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    halfInput: {
      flex: 1,
      marginRight: 8,
    },
    halfInputLast: {
      flex: 1,
      marginLeft: 8,
      marginRight: 0,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: theme.surfaceVariant,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    infoItem: {
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    stationRow: {
      backgroundColor: theme.primaryLight + '40',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      alignItems: 'center',
    },
    stationLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    stationCallsign: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.primary,
    },
    commentInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: theme.surfaceVariant,
      marginRight: 10,
    },
    submitButton: {
      backgroundColor: theme.primary,
      marginLeft: 10,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    submitText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textOnPrimary,
    },
  });

  const band = spot ? getBand(spot.frequency) : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Log QSO</Text>
            {spot && (
              <Text style={styles.headerSubtitle}>
                {spot.name}
              </Text>
            )}
          </View>

          <ScrollView style={styles.content}>
            {/* Station Callsign */}
            {stationCallsign && (
              <View style={styles.stationRow}>
                <Text style={styles.stationLabel}>Logging as</Text>
                <Text style={styles.stationCallsign}>{stationCallsign}</Text>
              </View>
            )}

            {/* Quick Info Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Band</Text>
                <Text style={styles.infoValue}>{band || 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Mode</Text>
                <Text style={styles.infoValue}>{mode}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Frequency</Text>
                <Text style={styles.infoValue}>{formatFrequency(frequency)}</Text>
              </View>
            </View>

            {/* Callsign */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Callsign</Text>
              <TextInput
                style={styles.input}
                value={callsign}
                onChangeText={setCallsign}
                placeholder="W1ABC"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {/* Park Reference */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Park Reference</Text>
              <TextInput
                style={styles.input}
                value={parkReference}
                onChangeText={setParkReference}
                placeholder="K-0001"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {/* RST Row */}
            <View style={[styles.inputGroup, styles.row]}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>RST Sent</Text>
                <TextInput
                  style={styles.input}
                  value={rstSent}
                  onChangeText={setRstSent}
                  placeholder="59"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
              <View style={styles.halfInputLast}>
                <Text style={styles.label}>RST Received</Text>
                <TextInput
                  style={styles.input}
                  value={rstReceived}
                  onChangeText={setRstReceived}
                  placeholder="59"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            </View>

            {/* Comment (for re-spot) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Comment (for Re-Spot)</Text>
              <TextInput
                style={[styles.input, styles.commentInput]}
                value={comment}
                onChangeText={setComment}
                placeholder="Optional comment..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !callsign.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.textOnPrimary} />
              ) : (
                <Text style={styles.submitText}>Log QSO</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
