import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Switch, StatusBar, Animated, Platform, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../utils/constants';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import RecipeCard from '../components/RecipeCard';

const RECIPES_STORAGE_KEY = 'generated_recipes';

export default function RecipesScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [includeGrocery, setIncludeGrocery] = useState(false);
  const [recipes, setRecipes] = useState([]);

  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, insets, isDark);

  const animation = useRef(new Animated.Value(0)).current;
  const wsRef = useRef(null);

  const loadRecipesFromStorage = async () => {
    try {
      const storedRecipes = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
      if (storedRecipes) {
        setRecipes(JSON.parse(storedRecipes));
      }
    } catch (error) {
      console.log('Failed to load recipes from storage', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (recipes.length === 0) {
        loadRecipesFromStorage();
      }
    }, [recipes.length])
  );

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleGenerateRecipes = async () => {
    if (loading) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      return;
    }

    setLoading(true);
    setRecipes([]);
    Animated.timing(animation, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    try {
      await AsyncStorage.removeItem(RECIPES_STORAGE_KEY);
      const token = await SecureStore.getItemAsync('auth_token');
      // Отримуємо мову
      const lang = i18n.language?.startsWith('uk') ? 'uk' : 'en';

      let wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      if (Platform.OS === 'android' && wsUrl.includes('localhost')) {
         wsUrl = wsUrl.replace('localhost', '10.0.2.2');
      } else if (Platform.OS === 'android' && wsUrl.includes('127.0.0.1')) {
         wsUrl = wsUrl.replace('127.0.0.1', '10.0.2.2');
      }

      // Додаємо параметр lang до запиту
      const ws = new WebSocket(`${wsUrl}/recipes/ws/generate?include_grocery=${includeGrocery}&token=${token}&lang=${lang}`);
      wsRef.current = ws;

      let messageBuffer = '';

      ws.onmessage = (event) => {
        messageBuffer += event.data;
        const newRecipes = messageBuffer.split('---').filter(r => r.trim() !== '');
        setRecipes(newRecipes);
      };

      ws.onclose = async () => {
        setLoading(false);
        Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        wsRef.current = null;
        try {
            const finalRecipes = messageBuffer.split('---').filter(r => r.trim() !== '');
            if (finalRecipes.length > 0) {
                await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(finalRecipes));
            }
        } catch (error) {
            console.log('Failed to save recipes', error);
        }
      };

      ws.onerror = (e) => {
        console.log("WebSocket Error:", e.message);
        setLoading(false);
        Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        wsRef.current = null;
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

      {/* ── Консистентний Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('recipes.title')}</Text>
        </View>

        <View style={styles.controls}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>{t('recipes.includeGrocery')}</Text>
            <Switch
              value={includeGrocery}
              onValueChange={setIncludeGrocery}
              trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
              thumbColor={COLORS.onPrimary ?? '#fff'}
              disabled={loading}
            />
          </View>

          <CustomButton
            title={loading ? t('recipes.cancelBtn') : t('recipes.generateBtn')}
            onPress={handleGenerateRecipes}
            loading={loading && recipes.length === 0}
            style={[styles.generateBtn, { backgroundColor: COLORS.primaryContainer }]}
            textStyle={{ color: COLORS.onPrimaryContainer }}
            disabled={loading}
            icon={
              <Animated.View style={animatedStyle}>
                <Ionicons name={loading ? "close" : "sparkles-outline"} size={22} color={COLORS.onPrimaryContainer} />
              </Animated.View>
            }
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && recipes.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('recipes.loading')}</Text>
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
            <Text style={styles.emptyTitle}>{t('recipes.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('recipes.emptyText')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (COLORS, insets, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    zIndex: 10
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
    letterSpacing: 0.5
  },
  backButton: {
    marginTop: 12,
  },

  // ─── Controls ──────────────────────────────────────────────────────────────
  controls: {
    gap: 16
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16
  },
  switchLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600'
  },
  generateBtn: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.15,
    shadowRadius: 8
  },

  // ─── List & States ─────────────────────────────────────────────────────────
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: (insets.bottom || 20) + 40
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.onSurfaceVariant,
    fontSize: 16,
    fontWeight: '500'
  },

  // ─── Empty state ───────────────────────────────────────────────────────────
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: '10%'
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24
  },
});