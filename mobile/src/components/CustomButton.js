import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import useThemeStore from '../store/themeStore'; // Import theme store

export default function CustomButton({ title, onPress, loading, variant = 'primary', style, textStyle, disabled, icon }) {
  const { colors: COLORS } = useThemeStore(); // Get colors from theme store
  const isFilled = variant === 'primary';
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  const isText = variant === 'text';

  const getBackgroundColor = () => {
    if (disabled) return COLORS.surfaceVariant;
    if (isFilled) return COLORS.primary;
    if (isDanger) return COLORS.danger;
    return 'transparent';
  };

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

  // Special style for outline danger
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