import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, Image } from 'react-native';
import CustomButton from '../../components/CustomButton';
import useAuthStore from '../../store/authStore';
import { COLORS } from '../../utils/constants';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Скануйте чеки або продукти',
    description: 'Просто зробіть фото за допомогою вбудованої камери. Наш ШІ розпізнає назву та автоматично виставить дату придатності.',
    image: 'https://cdn-icons-png.flaticon.com/512/3143/3143636.png'
  },
  {
    id: '2',
    title: 'Контролюйте свіжість',
    description: 'Freshify буде завчасно надсилати вам push-сповіщення про продукти, у яких завершується термін дії, щоб ви встигли їх з\'їсти.',
    image: 'https://cdn-icons-png.flaticon.com/512/2913/2913584.png'
  },
  {
    id: '3',
    title: 'Розумні рецепти та списки',
    description: 'Генеруйте ідеї для страв виключно з того, що вже лежить у вашому холодильнику, та автоматично створюйте списки покупок.',
    image: 'https://cdn-icons-png.flaticon.com/512/3502/3502688.png'
  }
];

export default function GuideScreen() {
  const { finishOnboarding } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      finishOnboarding(); // Закриваємо онбординг назавжди!
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
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideDesc}>{item.description}</Text>
          </View>
        )}
      />

      {/* Пагінація (Крапки) */}
      <View style={styles.indicatorContainer}>
        {SLIDES.map((_, index) => (
          <View 
            key={index} 
            style={[styles.indicator, currentIndex === index && styles.activeIndicator]} 
          />
        ))}
      </View>

      <View style={styles.footer}>
        <CustomButton 
          title={currentIndex === SLIDES.length - 1 ? "Почати роботу ✨" : "Далі"} 
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