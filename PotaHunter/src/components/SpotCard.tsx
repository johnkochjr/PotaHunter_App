import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SpotWithUserData, formatFrequency, getBand, getTimeAgo } from '../types/spot';
import {
  HuntedIcon,
  NotHuntedIcon,
  LocationIcon,
  FrequencyIcon,
  SpotterIcon,
  TimeIcon,
  CommentIcon,
} from './Icons';

interface SpotCardProps {
  spot: SpotWithUserData;
  onPress?: (spot: SpotWithUserData) => void;
  onReSpot?: (spot: SpotWithUserData) => void;
  onLog?: (spot: SpotWithUserData) => void;
}

export const SpotCard: React.FC<SpotCardProps> = ({ spot, onPress, onReSpot, onLog }) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    card: {
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
      borderLeftColor: spot.isHunted ? theme.hunted : theme.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    huntedIndicator: {
      marginRight: 12,
    },
    callsignContainer: {
      flex: 1,
    },
    callsign: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    reference: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
    },
    modeBadge: {
      backgroundColor: theme.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    modeText: {
      color: theme.primaryDark,
      fontWeight: '600',
      fontSize: 12,
    },
    parkName: {
      fontSize: 15,
      color: theme.text,
      marginBottom: 12,
      fontWeight: '500',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoIcon: {
      marginRight: 8,
      width: 20,
      alignItems: 'center',
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      flex: 1,
    },
    frequencyText: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '600',
    },
    bandBadge: {
      backgroundColor: theme.surfaceVariant,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      marginLeft: 8,
    },
    bandText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500',
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
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    timeText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginLeft: 6,
    },
    buttonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logButton: {
      backgroundColor: theme.success,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
    },
    logText: {
      color: theme.textOnPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    reSpotButton: {
      backgroundColor: theme.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    reSpotText: {
      color: theme.textOnPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
  });

  const band = getBand(spot.frequency);
  const timeAgo = getTimeAgo(spot.spotTime);

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress?.(spot)}
      android_ripple={{ color: theme.primaryLight }}
    >
      {/* Header: Hunted indicator, Callsign, Reference, Mode */}
      <View style={styles.header}>
        <View style={styles.huntedIndicator}>
          {spot.isHunted ? (
            <HuntedIcon size={28} color={theme.hunted} />
          ) : (
            <NotHuntedIcon size={28} color={theme.notHunted} />
          )}
        </View>
        <View style={styles.callsignContainer}>
          <Text style={styles.callsign}>{spot.activator}</Text>
          <Text style={styles.reference}>{spot.reference}</Text>
        </View>
        <View style={styles.modeBadge}>
          <Text style={styles.modeText}>{spot.mode}</Text>
        </View>
      </View>

      {/* Park Name */}
      <Text style={styles.parkName} numberOfLines={2}>
        {spot.name}
      </Text>

      {/* Location */}
      <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
          <LocationIcon size={18} color={theme.textSecondary} />
        </View>
        <Text style={styles.infoText}>{spot.locationDesc}</Text>
      </View>

      {/* Frequency */}
      <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
          <FrequencyIcon size={18} color={theme.textSecondary} />
        </View>
        <Text style={styles.frequencyText}>{formatFrequency(spot.frequency)}</Text>
        {band && (
          <View style={styles.bandBadge}>
            <Text style={styles.bandText}>{band}</Text>
          </View>
        )}
      </View>

      {/* Spotter */}
      <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
          <SpotterIcon size={18} color={theme.textSecondary} />
        </View>
        <Text style={styles.infoText}>Spotted by {spot.spotter}</Text>
      </View>

      {/* Comments (if any) */}
      {spot.comments && (
        <View style={styles.commentContainer}>
          <Text style={styles.commentText}>{spot.comments}</Text>
        </View>
      )}

      {/* Footer: Time and action buttons */}
      <View style={styles.footer}>
        <View style={styles.timeContainer}>
          <TimeIcon size={16} color={theme.textSecondary} />
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => onLog?.(spot)}
            activeOpacity={0.8}
          >
            <Text style={styles.logText}>LOG</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reSpotButton}
            onPress={() => onReSpot?.(spot)}
            activeOpacity={0.8}
          >
            <Text style={styles.reSpotText}>RE-SPOT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
};
