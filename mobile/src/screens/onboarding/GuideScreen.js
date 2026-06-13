import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import CustomButton from '../../components/CustomButton';
import useAuthStore from '../../store/authStore';
import { COLORS } from '../../utils/constants';

const { width } = Dimensions.get('window');

const SLIDE_KEYS = [
  { id: '1', titleKey: 'onboarding.guide1Title', descKey: 'onboarding.guide1Desc', image: 'https://cdn-icons-png.flaticon.com/512/3143/3143636.png' },
  { id: '2', titleKey: 'onboarding.guide2Title', descKey: 'onboarding.guide2Desc', image: 'https://cdn-icons-png.flaticon.com/512/2913/2913584.png' },
  { id: '3', titleKey: 'onboarding.guide3Title', descKey: 'onboarding.guide3Desc', image: 'https://cdn-icons-png.flaticon.com/512/3502/3502688.png' },
];

export default function GuideScreen() {
  const { t } = useTranslation();
  const { finishOnboarding } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < SLIDE_KEYS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      finishOnboarding();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDE_KEYS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={styles.slideTitle}>{t(item.titleKey)}</Text>
            <Text style={styles.slideDesc}>{t(item.descKey)}</Text>
          </View>
        )}
      />

      <View style={styles.indicatorContainer}>
        {SLIDE_KEYS.map((_, index) => (
          <View
            key={index}
            style={[styles.indicator, currentIndex === index && styles.activeIndicator]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <CustomButton
          title={currentIndex === SLIDE_KEYS.length - 1 ? t('onboarding.start') : t('common.next')}
          onPress={handleNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 40 },
  slide: { width: width, alignItems: 'center', padding: 32, justifyContent: 'center' },
  image: { width: width * 0.5, height: width * 0.5, resizeMode: 'contain', marginBottom: 40 },
  slideTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 16 },
  slideDesc: { fontSize: 15, color: COLORS.textLight, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  indicatorContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  indicator: { height: 8, width: 8, borderRadius: 4, backgroundColor: COLORS.border || '#cbd5e1', marginHorizontal: 5 },
  activeIndicator: { width: 24, backgroundColor: COLORS.primary },
  footer: { paddingHorizontal: 24, paddingBottom: 30 },
});
