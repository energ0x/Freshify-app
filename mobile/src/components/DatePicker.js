/**
 * @file DatePicker.js
 * @description A platform-abstracted date selector component.
 * Displays a simple button that triggers the native Android date picker modal,
 * or an inline iOS modal wrapper with Cancel/Confirm controls.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';
import { formatDate } from '../utils/dateHelpers';
import CustomButton from './CustomButton';
import { useTranslation } from 'react-i18next';

/**
 * DatePicker component displaying selected date and launching native/modal calendar pickers.
 * 
 * @param {Object} props
 * @param {Date} props.date - Currently selected Date object.
 * @param {Function} props.onDateChange - Callback function triggered when a date is selected.
 * @param {string} [props.label] - Label header placed above the date button.
 * @param {Date} [props.minimumDate] - Optional boundary: earliest selectable date.
 * @param {Date} [props.maximumDate] - Optional boundary: latest selectable date.
 * @returns {React.ReactElement} The DatePicker component.
 */
export default function DatePicker({ 
  date, 
  onDateChange, 
  label,
  minimumDate, // Optional: earliest selectable date limit
  maximumDate  // Optional: latest selectable date limit
}) {
  const { theme, colors: COLORS } = useThemeStore();
  const { t } = useTranslation();

  // Use localized label by default if no explicit override is provided
  const displayLabel = label !== undefined ? label : t('datePicker.expiryDate');

  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(date || new Date());

  const styles = getStyles(COLORS);

  /**
   * Triggers when user updates selection in the React Native Community DateTimePicker.
   * Handles platform difference: Android confirms instantly on click; iOS stores temporary value until confirmed.
   * 
   * @param {Object} event - Action event metadata.
   * @param {Date} [selectedDate] - The new date chosen by the user.
   */
  const onChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selectedDate) {
        onDateChange(selectedDate);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  /**
   * Confirms the selected date for iOS and closes the Modal container.
   */
  const handleIosConfirm = () => {
    onDateChange(tempDate);
    setShow(false);
  };

  return (
    <View style={styles.container}>
      {displayLabel ? <Text style={styles.label}>{displayLabel}</Text> : null}
      
      {/* Clickable selector box */}
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShow(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={COLORS.text} />
        <Text style={styles.dateText}>
          {date ? formatDate(date) : t('datePicker.chooseDate')}
        </Text>
      </TouchableOpacity>

      {/* Conditional rendering for OS platforms */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={show}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShow(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                onChange={onChange}
                minimumDate={minimumDate} // Apply minimum restriction bound
                maximumDate={maximumDate} // Apply maximum restriction bound
                themeVariant={theme}
                accentColor={COLORS.primary}
              />
              <View style={styles.modalActions}>
                <CustomButton title={t('common.cancel')} variant="outline" onPress={() => setShow(false)} style={{ flex: 1 }} />
                <CustomButton title={t('common.choose')} onPress={handleIosConfirm} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        show && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="default"
            onChange={onChange}
            minimumDate={minimumDate} // Apply minimum restriction bound
            maximumDate={maximumDate} // Apply maximum restriction bound
          />
        )
      )}
    </View>
  );
}

/**
 * Creates StyleSheet properties depending on the colors palette.
 * 
 * @param {Object} COLORS - Theme palette colors.
 * @returns {Object} React Native StyleSheet styles object.
 */
const getStyles = (COLORS) => StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    padding: 14,
  },
  dateText: { marginLeft: 10, fontSize: 16, color: COLORS.text },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 12, width: '100%' },
});