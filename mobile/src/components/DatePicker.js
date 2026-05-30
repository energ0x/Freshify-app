import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';
import { formatDate } from '../utils/dateHelpers';
import CustomButton from './CustomButton';

export default function DatePicker({ date, onDateChange, label = 'Термін придатності' }) {
  const { theme, colors: COLORS } = useThemeStore();

  // Спільний стан для показу пікера (Modal на iOS, системний діалог на Android)
  const [show, setShow] = useState(false);

  // Стан для тимчасової дати (використовується тільки на iOS)
  const [tempDate, setTempDate] = useState(date || new Date());

  const styles = getStyles(COLORS);

  const onChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      // Логіка для Android: закриваємо пікер і одразу зберігаємо дату
      setShow(false);
      if (selectedDate) {
        onDateChange(selectedDate);
      }
    } else {
      // Логіка для iOS: просто оновлюємо тимчасову дату, чекаємо підтвердження
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleIosConfirm = () => {
    onDateChange(tempDate);
    setShow(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShow(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={COLORS.text} />
        <Text style={styles.dateText}>
          {date ? formatDate(date) : 'Оберіть дату'}
        </Text>
      </TouchableOpacity>

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
                minimumDate={new Date()}
                themeVariant={theme}
                accentColor={COLORS.primary}
              />
              <View style={styles.modalActions}>
                <CustomButton title="Скасувати" variant="outline" onPress={() => setShow(false)} style={{ flex: 1 }} />
                <CustomButton title="Вибрати" onPress={handleIosConfirm} style={{ flex: 1 }} />
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
            minimumDate={new Date()}
          />
        )
      )}
    </View>
  );
}

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