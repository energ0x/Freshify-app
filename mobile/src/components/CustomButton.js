import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { COLORS } from '../utils/constants';

export default function CustomButton({ title, onPress, loading, variant = 'primary', style, textStyle, disabled, icon }) {
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

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        isOutline && styles.outline,
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
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

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
    borderWidth: 1,
    borderColor: COLORS.outline,
    elevation: 0,
  },
  disabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});