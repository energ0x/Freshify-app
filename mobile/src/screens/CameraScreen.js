import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { aiAPI } from '../services/api';
import { COLORS } from '../utils/constants';
import CustomButton from '../components/CustomButton';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Додаток потребує доступу до камери для розпізнавання продуктів.</Text>
        <CustomButton title="Надати дозвіл" onPress={requestPermission} />
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;

    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      const response = await aiAPI.analyzeImage(photo.uri);

      if (response.data.error) {
        Alert.alert('Увага', response.data.error);
        setLoading(false);
        return;
      }

      // Повертаємось на екран додавання і передаємо результат ШІ
      navigation.navigate('AddProduct', { aiResult: response.data });
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося розпізнати зображення. Спробуйте ще раз.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          <View style={styles.controls}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>ШІ аналізує фото...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: COLORS.background },
  permissionText: { textAlign: 'center', fontSize: 16, marginBottom: 20 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'space-between' },
  closeButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  controls: { paddingBottom: 50, alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  loadingContainer: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20, borderRadius: 12 },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 16, fontWeight: '500' },
});