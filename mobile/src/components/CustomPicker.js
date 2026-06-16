import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';

export default function CustomPicker({
  label,
  items,
  selectedValue,
  onValueChange,
}) {
  const { colors: COLORS, theme } = useThemeStore();
  const [modalVisible, setModalVisible] = useState(false);
  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark);

  const selectedItem = items.find(item => item.value === selectedValue);
  const selectedLabel = selectedItem ? selectedItem.label : `Обрати ${label?.toLowerCase() || 'значення'}`;

  const renderItem = ({ item }) => {
    const isSelected = item.value === selectedValue;
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => {
          onValueChange(item.value);
          setModalVisible(false);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
          {item.label}
        </Text>
        {isSelected && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.pickerButtonText, !selectedItem && styles.placeholderText]}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.onSurfaceVariant} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={item => item.value.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase', // Додано для ідентичності
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16, // Округлення як у наших інпутів
    paddingHorizontal: 16,
    height: 52, // Висота як у наших інпутів
  },
  pickerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.onSurfaceVariant,
  },

  // ─── Modal Styles ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    width: '90%',
    maxHeight: '60%',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.15,
    shadowRadius: 10,
  },
  item: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemSelected: {
    backgroundColor: `${COLORS.primary}15`, // Легкий фон для вибраного
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  itemTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});