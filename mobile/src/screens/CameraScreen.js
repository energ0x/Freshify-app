/**
 * @file CameraScreen.js
 * @description Camera integration screen using Expo Camera.
 * Supports three scan modes:
 * 1. Barcode scanner: Real-time scan matching against product databases.
 * 2. Product analyzer: Photo upload to Gemini AI to extract name/expiration/details.
 * 3. Receipt analyzer: Photo upload to scan multiple bought items.
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aiAPI, productsAPI } from '../services/api';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import { useTranslation } from 'react-i18next';

/**
 * CameraScreen Component.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation handler.
 * @param {Object} props.route - Route holding params like mode and language.
 */
export default function CameraScreen({ navigation, route }) {
  const { t } = useTranslation();
  
  // Scan mode options: 'barcode', 'product' (AI photo), or 'receipt' (AI recipe)
  const mode = route.params?.mode || 'product'; 
  const lang = route.params?.lang || 'uk';

  // Theme configuration details
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, insets, isDark);

  // Hook validating device camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const cameraRef = useRef(null);

  // Return blank container if permissions state is not resolved yet
  if (!permission) {
    return <View style={styles.container} />;
  }

  // Display request permission screen if not yet authorized
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>{t('camera.permissionRequired')}</Text>
        <CustomButton title={t('camera.grantPermission')} onPress={requestPermission} />
      </View>
    );
  }

  /**
   * Barcode scanner callback.
   * Resolves barcodes of formats EAN13, EAN8, etc. and routes to product addition screen.
   */
  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanned || mode !== 'barcode') return;
    setScanned(true);
    setLoading(true);
    
    try {
      // Analyze barcode ID via backend API
      const response = await productsAPI.analyzeBarcode(data, lang); 

      if (response?.data?.error) {
        Alert.alert(t('common.attention'), response.data.error);
        setScanned(false);
        setLoading(false);
        return;
      }

      // Navigate to AddProduct form populated with AI-extracted values
      navigation.navigate('AddProduct', { aiResult: response.data });
    } catch (error) {
      Alert.alert(t('common.error'), t('camera.unrecognizedBarcode'));
      setScanned(false);
      setLoading(false);
    }
  };

  /**
   * Captures photograph using active camera frame.
   * Compresses photo and uploads image to Gemini analyzer endpoint.
   */
  const takePicture = async () => {
    if (!cameraRef.current) return;

    setLoading(true);
    try {
      // Capture frame
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      
      // Upload captured frame to AI API
      const response = await aiAPI.analyzeImage(photo.uri, lang, mode); 

      if (response?.data?.error) {
        Alert.alert(t('common.attention'), response.data.error);
        setLoading(false);
        return;
      }

      // Navigate to AddProduct form populated with AI-extracted values
      navigation.navigate('AddProduct', { aiResult: response.data, imageUri: photo.uri });
    } catch (error) {
      Alert.alert(t('common.error'), t('camera.unrecognizedImage'));
      setLoading(false);
    }
  };

  /**
   * Helper mapping local guide messages to screen depending on scanning mode.
   */
  const getInstructionText = () => {
    if (mode === 'barcode') return t('camera.pointAtBarcode');
    if (mode === 'receipt') return t('camera.photoReceipt');
    return t('camera.photoProductClose');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
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
          {/* Header toolbar */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="close-outline" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('screens.scan')}</Text>
          </View>

          {/* Guide text overlay */}
          <Text style={styles.instructionText}>{getInstructionText()}</Text>

          {/* Barcode scanner target bounds frame */}
          {mode === 'barcode' && (
            <View style={styles.barcodeFrame} />
          )}

          {/* Bottom control panel */}
          <View style={styles.controls}>
            {loading ? (
              // Loading screen overlays during AI processes
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>
                  {mode === 'barcode' ? t('camera.searchingProduct') : t('camera.aiAnalyzing')}
                </Text>
              </View>
            ) : (
              // Capture trigger button (hidden in barcode scanner auto-recognition mode)
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

/**
 * Creates dynamic styles using active theme tokens, notch inserts, and navigation heights.
 */
const getStyles = (COLORS, insets, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: COLORS.background },
  permissionText: { textAlign: 'center', fontSize: 16, marginBottom: 20 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'space-between' },
  
  header: {
    position: 'absolute',
    gap: 12,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: insets.top + 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  backButton: {
      alignSelf: 'auto',
  },

  instructionText: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: insets.top + 100, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, paddingHorizontal: 20 },
  barcodeFrame: { width: 250, height: 150, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto', borderRadius: 16 },
  controls: { paddingBottom: 50, alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  loadingContainer: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20, borderRadius: 16 },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 16, fontWeight: '500' },
});