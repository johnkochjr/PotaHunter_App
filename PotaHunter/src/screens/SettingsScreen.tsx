import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { testHRDConnection } from '../services/hrdService';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { theme, themeName, setTheme, availableThemes } = useTheme();
  const { hrdSettings, updateHRDSettings } = useSettings();

  const [ipAddress, setIpAddress] = useState(hrdSettings.ipAddress);
  const [port, setPort] = useState(hrdSettings.port.toString());
  const [myCallsign, setMyCallsign] = useState(hrdSettings.myCallsign);
  const [isTesting, setIsTesting] = useState(false);

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
      alignItems: 'center',
    },
    backButton: {
      paddingRight: 16,
    },
    backText: {
      color: theme.textOnPrimary,
      fontSize: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.textOnPrimary,
    },
    content: {
      flex: 1,
    },
    section: {
      backgroundColor: theme.surface,
      marginTop: 16,
      marginHorizontal: 16,
      borderRadius: 12,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLabel: {
      fontSize: 16,
      color: theme.text,
    },
    rowValue: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    input: {
      backgroundColor: theme.surfaceVariant,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      color: theme.text,
      minWidth: 150,
      textAlign: 'right',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 16,
      color: theme.text,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonSecondary: {
      backgroundColor: theme.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    buttonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: theme.primary,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    buttonHalf: {
      flex: 1,
      marginHorizontal: 4,
    },
    themeSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
    },
    themeOption: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: theme.surfaceVariant,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    themeOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight + '30',
    },
    themeOptionText: {
      fontSize: 14,
      color: theme.text,
    },
    themeOptionTextSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
    statusText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    enabledStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    enabledDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
  });

  const handleSaveHRD = async () => {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      Alert.alert('Invalid Port', 'Please enter a valid port number (1-65535)');
      return;
    }

    if (!myCallsign.trim()) {
      Alert.alert('Missing Callsign', 'Please enter your callsign');
      return;
    }

    await updateHRDSettings({
      ipAddress: ipAddress.trim(),
      port: portNum,
      myCallsign: myCallsign.trim().toUpperCase(),
    });

    Alert.alert('Saved', 'HRD settings have been saved');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    const result = await testHRDConnection({
      ...hrdSettings,
      ipAddress: ipAddress.trim(),
      port: parseInt(port, 10),
    });
    setIsTesting(false);

    Alert.alert(
      result.success ? 'Success' : 'Connection Failed',
      result.message
    );
  };

  const handleToggleEnabled = async (value: boolean) => {
    await updateHRDSettings({ enabled: value });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* HRD Connection Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ham Radio Deluxe</Text>

          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Enable HRD Control</Text>
            <Switch
              value={hrdSettings.enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={hrdSettings.enabled ? theme.primary : theme.surfaceVariant}
            />
          </View>

          <View style={styles.enabledStatus}>
            <View
              style={[
                styles.enabledDot,
                { backgroundColor: hrdSettings.enabled ? theme.success : theme.textSecondary },
              ]}
            />
            <Text style={styles.rowValue}>
              {hrdSettings.enabled ? 'Tap a spot to tune radio' : 'Radio control disabled'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HRD Relay Settings</Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>My Callsign</Text>
            <TextInput
              style={styles.input}
              value={myCallsign}
              onChangeText={setMyCallsign}
              placeholder="W1ABC"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Relay IP Address</Text>
            <TextInput
              style={styles.input}
              value={ipAddress}
              onChangeText={setIpAddress}
              placeholder="127.0.0.1"
              placeholderTextColor={theme.textSecondary}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Relay Port</Text>
            <TextInput
              style={styles.input}
              value={port}
              onChangeText={setPort}
              placeholder="7810"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, styles.buttonHalf]}
              onPress={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Test Connection
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonHalf]}
              onPress={handleSaveHRD}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.statusText}>
            Run the HRD Relay server (node relay.js) on your PC alongside HRD
          </Text>
        </View>

        {/* Theme Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>

          <Text style={styles.inputLabel}>Color Theme</Text>
          <View style={styles.themeSelector}>
            {availableThemes.map((name) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.themeOption,
                  themeName === name && styles.themeOptionSelected,
                ]}
                onPress={() => setTheme(name)}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    themeName === name && styles.themeOptionTextSelected,
                  ]}
                >
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
