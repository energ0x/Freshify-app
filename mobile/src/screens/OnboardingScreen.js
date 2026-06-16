/**
 * @file OnboardingScreen.js
 * @description Screen component for the onboarding workflow. Displays a series of slides
 * introducing the application features (scanning products, monitoring freshness, smart lists)
 * using a horizontal paginated FlatList, complete with page indicators and skip/next buttons.
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  Dimensions, 
  TouchableOpacity 
} from 'react-native';
import CustomButton from '../components/CustomButton';
import useAuthStore from '../store/authStore';
import { COLORS } from '../utils/constants';

// Retrieve window dimensions to size slides to fit full-width screen dynamically
const { width, height } = Dimensions.get('window');

/**
 * Static slides array containing details for each onboarding screen.
 */
const slides = [
  {
    id: '1',
    title: 'Скануйте продукти',
    description: 'Зробіть фото продукту, і наш ШІ автоматично визначить його термін придатності',
    imageUri: 'https://cdn-icons-png.flaticon.com/512/3143/3143636.png',
  },
  {
    id: '2',
    title: 'Слідкуйте за свіжістю',
    description: 'Отримуйте сповіщення до того, як продукти зіпсуються',
    imageUri: 'https://cdn-icons-png.flaticon.com/512/2913/2913520.png',
  },
  {
    id: '3',
    title: 'Розумні списки',
    description: 'Формуйте списки покупок на основі того, що закінчилося в холодильнику',
    imageUri: 'https://cdn-icons-png.flaticon.com/512/1004/1004313.png',
  }
];

/**
 * OnboardingScreen component.
 * Manages rendering of onboarding steps and persists completion state.
 * 
 * @param {object} props.navigation - React Navigation reference.
 */
export default function OnboardingScreen({ navigation }) {
  // State tracking the current page index.
  const [currentIndex, setCurrentIndex] = useState(0);
  // Reference to the FlatList component to programmatic control scrolling.
  const flatListRef = useRef(null);
  
  // Retrieve the method to mark onboarding as completed from Auth store.
  const { finishOnboarding } = useAuthStore();

  /**
   * Finalizes onboarding. Calls the finishOnboarding action if available,
   * otherwise redirects directly to the main application stack.
   */
  const handleSkipOrFinish = () => {
    if (finishOnboarding) {
      finishOnboarding(); 
    } else {
      navigation.replace('Main'); 
    }
  };

  /**
   * Handles click on the Next/Start button.
   * If not on the last page, scroll to the next slide; otherwise, finish onboarding.
   */
  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleSkipOrFinish();
    }
  };

  /**
   * Calculates the current active page index based on horizontal scroll offset of the FlatList.
   * Called on scroll momentum completion.
   * 
   * @param {object} e - Scroll event details containing content offset.
   */
  const updateCurrentIndex = (e) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / width);
    setCurrentIndex(newIndex);
  };

  return (
    <View style={styles.container}>
      {/* Header section containing the Skip button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkipOrFinish}>
          <Text style={styles.skipText}>Пропустити</Text>
        </TouchableOpacity>
      </View>
      
      {/* Horizontal FlatList for onboarding slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        contentContainerStyle={{ alignItems: 'center' }}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={updateCurrentIndex}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image 
              source={{ uri: item.imageUri }}
              style={styles.image} 
            />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      {/* Footer containing progress dots and the primary progression button */}
      <View style={styles.footer}>
        {/* Carousel indicators representing each slide */}
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentIndex === index && styles.activeIndicator
              ]}
            />
          ))}
        </View>
        
        {/* Next page / Complete button */}
        <CustomButton 
          title={currentIndex === slides.length - 1 ? "Почати роботу" : "Далі"} 
          onPress={handleNext} 
        />
      </View>
    </View>
  );
}

// Styling definitions for onboarding components
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#fff' },
  header: {
    paddingTop: 50,
    paddingRight: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 90,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.primary || '#4CAF50',
    fontWeight: '600',
  },
  slide: {
    width,
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: width * 0.8,
    height: height * 0.4,
    resizeMode: 'contain',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text || '#333',
    marginTop: 40,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.textLight || '#666',
    textAlign: 'center',
    marginTop: 15,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  activeIndicator: {
    backgroundColor: COLORS.primary || '#4CAF50',
    width: 20,
  },
});