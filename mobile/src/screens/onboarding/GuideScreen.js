/**
 * @file GuideScreen.js
 * @description The onboarding presentation slider screen.
 * Displays educational illustrations/slides describing the application features,
 * with flatlist-based pagination indicators, next page actions, and completion flow.
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, FlatList, Image, StatusBar
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomButton from '../../components/CustomButton';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';

const { width } = Dimensions.get('window');

// Local map of assets loaded by onboarding slides
const IMAGE_MAP = {
  scan: require('../../assets/scan.png'),
  apple: require('../../assets/apple-core.png'),
  chef: require('../../assets/chef.png'),
};

// Data structure declaring properties for guide pagination pages
const SLIDE_KEYS = [
  {
    id: '1',
    titleKey: 'guide.slide1Title',
    descKey: 'guide.slide1Desc',
    imageKey: 'scan'
  },
  {
    id: '2',
    titleKey: 'guide.slide2Title',
    descKey: 'guide.slide2Desc',
    imageKey: 'apple'
  },
  {
    id: '3',
    titleKey: 'guide.slide3Title',
    descKey: 'guide.slide3Desc',
    imageKey: 'chef'
  }
];

/**
 * GuideScreen screen presenting app tutorials through a horizontal FlatList.
 * 
 * @returns {React.ReactElement} The rendered GuideScreen.
 */
export default function GuideScreen() {
  const { t } = useTranslation();
  const { finishOnboarding } = useAuthStore();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  /**
   * Action handler triggered when clicking the "Next" button.
   * If on intermediate slides, triggers list scroll. If on final slide, terminates onboarding session.
   */
  const handleNext = () => {
    if (currentIndex < SLIDE_KEYS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finishOnboarding();
    }
  };

  /**
   * List listener tracking when a new slide becomes centered.
   * Updates state representation to shift active dot position index.
   */
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.container}>
      {/* Configure device status bar appearance based on theme settings */}
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />

      {/* Main onboarding horizontal content slides */}
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
            <View style={styles.imageContainer}>
                <Image source={IMAGE_MAP[item.imageKey]} style={styles.image} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.slideTitle}>{t(item.titleKey)}</Text>
              <Text style={styles.slideDesc}>{t(item.descKey)}</Text>
            </View>
          </View>
        )}
      />

      {/* Slider pagination indicator dots */}
      <View style={styles.indicatorContainer}>
        {SLIDE_KEYS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              currentIndex === index && styles.activeIndicator
            ]}
          />
        ))}
      </View>

      {/* Screen action footer button */}
      <View style={styles.footer}>
        <CustomButton
          title={currentIndex === SLIDE_KEYS.length - 1 ? t('guide.start', 'Почати роботу ✨') : t('common.next', 'Далі')}
          onPress={handleNext}
          style={styles.button}
        />
      </View>
    </View>
  );
}

/**
 * Creates dynamic styles corresponding to device metrics, safe zone margins, and theme palette.
 * 
 * @param {Object} COLORS - Theme palette colors.
 * @param {boolean} isDark - Active theme setting status.
 * @param {Object} insets - Screen safe inset coordinates.
 * @returns {Object} React Native StyleSheet styles object.
 */
const getStyles = (COLORS, isDark, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  slide: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: insets.top,
  },
  imageContainer: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: (width * 0.65) / 2,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  image: {
    width: '55%',
    height: '55%',
    resizeMode: 'contain',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  slideDesc: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  indicator: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceVariant,
  },
  activeIndicator: {
    width: 24,
    backgroundColor: COLORS.primary
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: (insets.bottom || 20) + 10,
  },
  button: {
    height: 56,
    borderRadius: 16,
  }
});