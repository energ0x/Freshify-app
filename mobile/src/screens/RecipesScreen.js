import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Switch, TouchableOpacity, StatusBar, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../utils/constants';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import RecipeCard from '../components/RecipeCard';

export default function RecipesScreen() {
  const [loading, setLoading] = useState(false);
  const [includeGrocery, setIncludeGrocery] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [recipes, setRecipes] = useState([]);

  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = getStyles(COLORS, insets, tabBarHeight);

  const animation = useRef(new Animated.Value(0)).current;
  const wsRef = useRef(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    // Разделяем стрим текста на отдельные рецепты по разделителю "---"
    if (streamedText) {
      const rawRecipes = streamedText.split('---').filter(r => r.trim() !== '');
      setRecipes(rawRecipes);
    } else {
        setRecipes([]);
    }
  }, [streamedText]);

  const handleGenerateRecipes = async () => {
    if (loading) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setLoading(false);
      Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      return;
    }

    setLoading(true);
    setStreamedText('');
    setRecipes([]);
    Animated.timing(animation, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    try {
      const token = await SecureStore.getItemAsync('auth_token');
      
      let wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      if (Platform.OS === 'android' && wsUrl.includes('localhost')) {
         wsUrl = wsUrl.replace('localhost', '10.0.2.2');
      } else if (Platform.OS === 'android' && wsUrl.includes('127.0.0.1')) {
         wsUrl = wsUrl.replace('127.0.0.1', '10.0.2.2');
      }
      
      const ws = new WebSocket(`${wsUrl}/recipes/ws/generate?include_grocery=${includeGrocery}&token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        setStreamedText(prev => prev + event.data);
      };

      ws.onclose = (event) => {
        setLoading(false);
        Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      };

      ws.onerror = (e) => {
        console.log("WebSocket Error:", e.message);
        setLoading(false);
        Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      };

    } catch (error) {
      console.log('Помилка ініціалізації WebSocket', error);
      setLoading(false);
      Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  };

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const animatedStyle = {
    transform: [{ rotate: rotateInterpolate }],
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Рецепти від AI</Text>
        <View style={styles.controls}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Врахувати список покупок</Text>
            <Switch
              value={includeGrocery}
              onValueChange={setIncludeGrocery}
              trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
              thumbColor={COLORS.onPrimary}
            />
          </View>
          <CustomButton
            title={loading ? "Скасувати" : "Згенерувати рецепти"}
            onPress={handleGenerateRecipes}
            loading={loading && !streamedText}
            style={styles.generateBtn}
            icon={
              <Animated.View style={animatedStyle}>
                <Ionicons name={loading ? "close" : "sparkles-outline"} size={20} color={COLORS.onPrimary} />
              </Animated.View>
            }
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && !streamedText ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Шеф-кухар Gemini думає...</Text>
          </View>
        ) : recipes.length > 0 ? (
           recipes.map((recipeContent, index) => (
             <RecipeCard key={index} content={recipeContent} />
           ))
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="restaurant-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Згенеруйте рецепти</Text>
            <Text style={styles.emptyText}>Натисніть кнопку, щоб отримати ідеї страв на основі продуктів у вашому холодильнику</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (COLORS, insets, tabBarHeight) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: {
    paddingTop: insets.top || 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  controls: { 
    paddingHorizontal: 20, 
  },
  switchContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
    backgroundColor: COLORS.surfaceVariant,
    padding: 16,
    borderRadius: 16,
  },
  switchLabel: { 
    fontSize: 16, 
    color: COLORS.text,
    fontWeight: '500',
  },
  generateBtn: { 
    borderRadius: 100,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16, 
    paddingBottom: tabBarHeight + 40,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  loadingText: { 
    marginTop: 16, 
    color: COLORS.textLight, 
    fontSize: 16 
  },
  empty: { 
    flex: 1,
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: { 
    fontSize: 16, 
    color: COLORS.textLight, 
    textAlign: 'center',
    lineHeight: 24,
  },
});