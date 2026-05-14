import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useProductStore from '../store/productStore';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';
import { getExpiryLabel, getExpiryColor, formatDate } from '../utils/dateHelpers';

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const { products, deleteProduct, consumeProduct } = useProductStore();
  const [loading, setLoading] = useState(false);

  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Продукт не знайдено</Text>
      </View>
    );
  }

  const expiryColor = getExpiryColor(product.expiry_date, COLORS);

  const handleDelete = () => {
    Alert.alert('Видалення', 'Ви впевнені, що хочете видалити цей продукт?', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteProduct(product.id);
          if (res.success) navigation.goBack();
          else Alert.alert('Помилка', res.error);
        }
      }
    ]);
  };

  const handleConsume = async () => {
    // Для простоти споживаємо весь залишок або 1 одиницю
    const amountToConsume = product.quantity >= 1 ? 1 : product.quantity;

    Alert.alert('Споживання', `Використати ${amountToConsume} ${product.unit}?`, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Так',
        onPress: async () => {
          setLoading(true);
          const res = await consumeProduct(product.id, amountToConsume);
          setLoading(false);

          if (res.success) {
            Alert.alert('Успіх', 'Продукт додано до аналітики споживання');
            if (product.quantity - amountToConsume <= 0) {
              navigation.goBack();
            }
          } else {
            Alert.alert('Помилка', res.error);
          }
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.category}>{product.category || 'Без категорії'}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="scale-outline" size={24} color={COLORS.textLight} />
          <Text style={styles.infoText}>Залишок: <Text style={styles.bold}>{product.quantity} {product.unit}</Text></Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={24} color={COLORS.textLight} />
          <View>
            <Text style={styles.infoText}>Придатний до: <Text style={styles.bold}>{formatDate(product.expiry_date)}</Text></Text>
            <Text style={[styles.expiryLabel, { color: expiryColor }]}>{getExpiryLabel(product.expiry_date)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <CustomButton
          title="Спожити продукт"
          onPress={handleConsume}
          loading={loading}
          style={styles.consumeButton}
        />
        <CustomButton
          title="Видалити"
          variant="danger"
          onPress={handleDelete}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  name: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  category: { fontSize: 16, color: COLORS.primary, marginBottom: 20, fontWeight: '500' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoText: { fontSize: 16, color: COLORS.text, marginLeft: 12 },
  bold: { fontWeight: '600' },
  expiryLabel: { fontSize: 14, fontWeight: '500', marginLeft: 12, marginTop: 4 },
  actions: { gap: 12 },
  consumeButton: { backgroundColor: COLORS.secondary },
});