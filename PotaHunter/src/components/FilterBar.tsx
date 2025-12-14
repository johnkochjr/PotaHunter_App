import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Switch,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: FilterOption[];
  onSelect: (value: string) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  value,
  options,
  onSelect,
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      marginHorizontal: 4,
    },
    button: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    buttonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight + '20',
    },
    labelText: {
      fontSize: 10,
      color: theme.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    valueText: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '500',
    },
    arrow: {
      fontSize: 10,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      width: '80%',
      maxHeight: '60%',
      overflow: 'hidden',
    },
    modalHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    optionItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    optionItemSelected: {
      backgroundColor: theme.primaryLight + '30',
    },
    optionText: {
      fontSize: 16,
      color: theme.text,
    },
    optionTextSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
  });

  const isActive = value !== 'all';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isActive && styles.buttonActive]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View>
          <Text style={styles.labelText}>{label}</Text>
          <Text style={styles.valueText}>{selectedOption?.label || 'All'}</Text>
        </View>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label}</Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === value && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// Band options based on common amateur bands
const BAND_OPTIONS: FilterOption[] = [
  { label: 'All Bands', value: 'all' },
  { label: '160m', value: '160m' },
  { label: '80m', value: '80m' },
  { label: '60m', value: '60m' },
  { label: '40m', value: '40m' },
  { label: '30m', value: '30m' },
  { label: '20m', value: '20m' },
  { label: '17m', value: '17m' },
  { label: '15m', value: '15m' },
  { label: '12m', value: '12m' },
  { label: '10m', value: '10m' },
  { label: '6m', value: '6m' },
  { label: '2m', value: '2m' },
  { label: '70cm', value: '70cm' },
];

// Mode options
const MODE_OPTIONS: FilterOption[] = [
  { label: 'All Modes', value: 'all' },
  { label: 'SSB', value: 'SSB' },
  { label: 'CW', value: 'CW' },
  { label: 'FT8', value: 'FT8' },
  { label: 'FT4', value: 'FT4' },
  { label: 'AM', value: 'AM' },
  { label: 'FM', value: 'FM' },
  { label: 'RTTY', value: 'RTTY' },
  { label: 'PSK', value: 'PSK' },
  { label: 'JS8', value: 'JS8' },
];

interface FilterBarProps {
  bandFilter: string;
  modeFilter: string;
  onBandChange: (band: string) => void;
  onModeChange: (mode: string) => void;
  hideHunted: boolean;
  onHideHuntedChange: (hide: boolean) => void;
  resultCount?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  bandFilter,
  modeFilter,
  onBandChange,
  onModeChange,
  hideHunted,
  onHideHuntedChange,
  resultCount,
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    filtersRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    hideHuntedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    hideHuntedLabel: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '500',
    },
    resultCount: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      paddingVertical: 4,
      backgroundColor: theme.background,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.filtersRow}>
        <FilterDropdown
          label="Band"
          value={bandFilter}
          options={BAND_OPTIONS}
          onSelect={onBandChange}
        />
        <FilterDropdown
          label="Mode"
          value={modeFilter}
          options={MODE_OPTIONS}
          onSelect={onModeChange}
        />
      </View>
      <View style={styles.hideHuntedRow}>
        <Text style={styles.hideHuntedLabel}>Hide Hunted Spots</Text>
        <Switch
          value={hideHunted}
          onValueChange={onHideHuntedChange}
          trackColor={{ false: theme.border, true: theme.primaryLight }}
          thumbColor={hideHunted ? theme.primary : theme.surfaceVariant}
        />
      </View>
      {resultCount !== undefined && (bandFilter !== 'all' || modeFilter !== 'all' || hideHunted) && (
        <Text style={styles.resultCount}>
          Showing {resultCount} spot{resultCount !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
};
