import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { formatDate } from '../utils/dateHelpers';

export default function DatePicker({ date, onDateChange, label = 'Термін придатності' }) {
  const [show, setShow] = useState(false);

  const onChange = (event, selectedDate) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      onDateChange(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShow(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={COLORS.text} />
        <Text style={styles.dateText}>
          {date ? formatDate(date) : 'Оберіть дату'}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={onChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
  },
});