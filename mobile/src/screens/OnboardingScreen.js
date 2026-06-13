import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import useAuthStore from '../store/authStore';
import { COLORS } from '../utils/constants';

const { width, height } = Dimensions.get('window');

const SLIDE_KEYS = [
  { id: '1', titleKey: 'onboarding.slide1Title', descKey: 'onboarding.slide1Desc', imageUri: 'https://cdn-icons-png.flaticon.com/512/3143/3143636.png' },
  { id: '2', titleKey: 'onboarding.slide2Title', descKey: 'onboarding.slide2Desc', imageUri: 'https://cdn-icons-png.flaticon.com/512/2913/2913520.png' },
  { id: '3', titleKey: 'onboarding.slide3Title', descKey: 'onboarding.slide3Desc', imageUri: 'https://cdn-icons-png.flaticon.com/512/1004/1004313.png' },
];

export default function OnboardingScreen({ navigation }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const { finishOnboarding } = useAuthStore();

  const handleSkipOrFinish = () => {
    if (finishOnboarding) {
      finishOnboarding();
    } else {
      navigation.replace('Main');
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDE_KEYS.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleSkipOrFinish();
    }
  };

  const updateCurrentIndex = (e) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    setCurrentIndex(Math.round(contentOffsetX / width));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkipOrFinish}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={SLIDE_KEYS}
        contentContainerStyle={{ alignItems: 'center' }}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={updateCurrentIndex}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={{ uri: item.imageUri }} style={styles.image} />
            <Text style={styles.title}>{t(item.titleKey)}</Text>
            <Text style={styles.description}>{t(item.descKey)}</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {SLIDE_KEYS.map((_, index) => (
            <View key={index} style={[styles.indicator, currentIndex === index && styles.activeIndicator]} />
          ))}
        </View>
        <CustomButton
          title={currentIndex === SLIDE_KEYS.length - 1 ? t('onboarding.start') : t('common.next')}
          onPress={handleNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#fff' },
  header: { paddingTop: 50, paddingRight: 20, alignItems: 'flex-end', justifyContent: 'center', height: 90 },
  skipText: { fontSize: 16, color: COLORS.primary || '#4CAF50', fontWeight: '600' },
  slide: { width, alignItems: 'center', padding: 20 },
  image: { width: width * 0.8, height: height * 0.4, resizeMode: 'contain', marginTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text || '#333', marginTop: 40, textAlign: 'center' },
  description: { fontSize: 16, color: COLORS.textLight || '#666', textAlign: 'center', marginTop: 15, paddingHorizontal: 20, lineHeight: 24 },
  footer: { paddingHorizontal: 20, paddingBottom: 40 },
  indicatorContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  indicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ccc', marginHorizontal: 5 },
  activeIndicator: { backgroundColor: COLORS.primary || '#4CAF50', width: 20 },
});
