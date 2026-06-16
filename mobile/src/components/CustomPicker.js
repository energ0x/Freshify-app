/**
 * @file CustomPicker.js
 * @description A custom modal-based selector/dropdown component for React Native.
 * Used to display and pick from a list of option items on both iOS and Android.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';

/**
 * CustomPicker component displaying a touchable field that launches a choice Modal overlay.
 * 
 * @param {Object} props
 * @param {string} [props.label] - Explanatory label title displayed above the dropdown field.
 * @param {Object[]} props.items - Array of options to select from.
 * @param {string|number} props.items[].label - Visual string of the option.
 * @param {any} props.items[].value - Backend or programmatic value of the option.
 * @param {any} props.selectedValue - Currently selected option value.
 * @param {Function} props.onValueChange - Callback triggered when a new option is clicked.
 * @returns {React.ReactElement} The CustomPicker component.
 */
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

  /**
   * Renders a single selectable item inside the FlatList.
   * Highlights the current active selection with a primary theme background color and checkmark icon.
   * 
   * @param {Object} itemContainer
   * @param {Object} itemContainer.item - The option object containing label and value.
   * @returns {React.ReactElement} The touchable row component.
   */
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
      {/* Label header displayed above the select container */}
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Button component triggering the overlay modal */}
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

      {/* Choice selection Modal */}
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
          {/* Inner card holding the options list */}
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

/**
 * Generates Stylesheet rules according to theme state.
 * 
 * @param {Object} COLORS - Theme colors configuration.
 * @param {boolean} isDark - Dark mode check.
 * @returns {Object} React Native StyleSheet styles object.
 */
const getStyles = (COLORS, isDark) => StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16, // Matching input element curvature
    paddingHorizontal: 16,
    height: 56, // Uniform input field height
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
    backgroundColor: `${COLORS.primary}15`, // Light primary tint background for selected state
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