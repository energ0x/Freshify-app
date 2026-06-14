import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { aiAPI, productsAPI } from '../services/api';
import { COLORS } from '../utils/constants';
import CustomButton from '../components/CustomButton';
import {useTranslation} from 'react-i18next';

export default function CameraScreen({ navigation, route }) {
  const { t } = useTranslation();
  const mode = route.params?.mode || 'product'; 

  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>{t('camera.permissionRequired')}</Text>
        <CustomButton title={t('camera.grantPermission')} onPress={requestPermission} />
      </View>
    );
  }

  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanned || mode !== 'barcode') return;
    setScanned(true);
    setLoading(true);
    
    try {
      const response = await productsAPI.analyzeBarcode(data);

      if (response?.data?.error) {
        Alert.alert(t('common.attention'), response.data.error);
        setScanned(false);
        setLoading(false);
        return;
      }

      navigation.navigate('AddProduct', { aiResult: response.data });
    } catch (error) {
      Alert.alert(t('common.error'), t('camera.unrecognizedBarcode'));
      setScanned(false);
      setLoading(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      const response = await aiAPI.analyzeImage(photo.uri);

      if (response?.data?.error) {
        Alert.alert(t('common.attention'), response.data.error);
        setLoading(false);
        return;
      }

      navigation.navigate('AddProduct', { aiResult: response.data, imageUri: photo.uri });
    } catch (error) {
      Alert.alert(t('common.error'), t('camera.unrecognizedImage'));
      setLoading(false);
    }
  };

  const getInstructionText = () => {
    if (mode === 'barcode') return t('camera.pointAtBarcode');
    if (mode === 'receipt') return t('camera.photoReceipt');
    return t('camera.photoProductClose');
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="back" 
        ref={cameraRef}
        onBarcodeScanned={mode === 'barcode' && !scanned ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e"],
        }}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.instructionText}>{getInstructionText()}</Text>

          {mode === 'barcode' && (
            <View style={styles.barcodeFrame} />
          )}

          <View style={styles.controls}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>
                  {mode === 'barcode' ? t('camera.searchingProduct') : t('camera.aiAnalyzing')}
                </Text>
              </View>
            ) : (
              mode !== 'barcode' && (
                <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              )
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'space-between' },
  closeButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  
  instructionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 100,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    paddingHorizontal: 20,
  },
  
  barcodeFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    borderRadius: 16,
  },

  controls: { paddingBottom: 50, alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  loadingContainer: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20, borderRadius: 16 },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 16, fontWeight: '500' },
});