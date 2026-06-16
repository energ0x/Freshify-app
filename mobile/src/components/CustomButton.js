/**
 * @file CustomButton.js
 * @description A highly customisable, theme-aware touchable button component 
 * supporting primary, outline, danger, and text variants with optional icons and loading indicators.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import useThemeStore from '../store/themeStore'; // Import theme store

/**
 * CustomButton functional component representing a consistent button style across the app.
 *
 * @param {Object} props
 * @param {string} props.title - The label text printed inside the button.
 * @param {Function} props.onPress - Callback trigger function on user click/press.
 * @param {boolean} [props.loading] - Flag that shows a loading activity indicator instead of the title.
 * @param {('primary'|'outline'|'danger'|'text')} [props.variant='primary'] - Visual appearance variation.
 * @param {Object} [props.style] - Custom container stylesheet rules to override default layout.
 * @param {Object} [props.textStyle] - Custom font/text stylesheet rules to override default text.
 * @param {boolean} [props.disabled] - Flag to disable button click interactions and update style.
 * @param {React.ReactElement} [props.icon] - Optional prefix icon element placed to the left of the text.
 * @returns {React.ReactElement} CustomButton component.
 */
export default function CustomButton({ title, onPress, loading, variant = 'primary', style, textStyle, disabled, icon }) {
  const { colors: COLORS } = useThemeStore(); // Get colors from theme store
  const isFilled = variant === 'primary';
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  const isText = variant === 'text';

  /**
   * Helper that decides background color depending on button variant and disabled state.
   * 
   * @returns {string} Hex or RGBA color code.
   */
  const getBackgroundColor = () => {
    if (disabled) return COLORS.surfaceVariant;
    if (isFilled) return COLORS.primary;
    if (isDanger) return COLORS.danger;
    return 'transparent';
  };

  /**
   * Helper that decides text color based on button variant, active state, and theme colors.
   * 
   * @returns {string} Hex or RGBA color code.
   */
  const getTextColor = () => {
    if (disabled) return COLORS.onSurfaceVariant;
    if (isFilled) return COLORS.onPrimary;
    if (isDanger) return COLORS.onPrimary;
    if (isOutline) return COLORS.primary;
    if (isText) return COLORS.primary;
    return COLORS.text;
  };

  // Dynamically create styles to use theme colors
  const styles = StyleSheet.create({
    button: {
      borderRadius: 100, // Pill shape
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2, // Android shadow
      shadowColor: '#000', // iOS shadow
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    outline: {
      borderWidth: 1.5,
      borderColor: isDanger ? COLORS.danger : COLORS.outline, // Use danger color for border if variant is danger
      elevation: 0,
    },
    disabled: {
      elevation: 0,
      shadowOpacity: 0,
      backgroundColor: COLORS.surfaceVariant,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center', // Center content horizontally
    },
    iconContainer: {
      marginRight: 10, // A bit more space
    },
    text: {
      fontSize: 16,
      fontWeight: '700', // Bolder text
      textAlign: 'center',
    },
  });

  // Special style mapping for outlined danger variant to override border and text colors
  const outlineDangerStyle = (isOutline && isDanger) ? { borderColor: COLORS.danger } : {};
  const outlineDangerTextStyle = (isOutline && isDanger) ? { color: COLORS.danger } : {};

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        isOutline && styles.outline,
        isOutline && isDanger && outlineDangerStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {/* Conditionally render spinner loader or the content block containing icon and text */}
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, { color: getTextColor() }, textStyle, isOutline && isDanger && outlineDangerTextStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}