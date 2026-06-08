import React, { useEffect, useRef, useCallback } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from "expo-blur";
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

// Імпорти екранів
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import AddProductScreen from '../screens/AddProductScreen';
import CameraScreen from '../screens/CameraScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import GroceryListScreen from '../screens/GroceryListScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import RecipesScreen from '../screens/RecipesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import DietScreen from '../screens/onboarding/DietScreen';
import AllergensScreen from '../screens/onboarding/AllergensScreen';
import GuideScreen from '../screens/onboarding/GuideScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import PremiumScreen from '../screens/PremiumScreen';
import LeaguesScreen from '../screens/LeaguesScreen';
import DietSettingsScreen from '../screens/DietSettingsScreen';
import AllergensSettingsScreen from '../screens/AllergensSettingsScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import DailyTasksScreen from '../screens/DailyTasksScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// Тривалість анімації по платформах.
//
// iOS:     160 мс — трохи довша, відповідає плавній iOS-естетиці
// Android: 100 мс — коротша, щоб навіть 1-2 кадри затримки JS-потоку
//          були непомітні (нічого невидимого краще, ніж затемнений кадр)
// ─────────────────────────────────────────────────────────────────────────────
const TAB_FADE_DURATION = Platform.select({ ios: 160, android: 100, default: 130 });

// ─────────────────────────────────────────────────────────────────────────────
// withTabAnimation — HOC для плавного fade-in при переключенні вкладок.
//
// Чому попередній код мигав на Android:
//   1. `new Animated.Value(0.3)` — екран рендерився видимим (30% opacity)
//      ще до того, як анімація починалась → видимий "тьмяний" кадр.
//   2. `opacity.setValue(0.3)` у cleanup — при виході з вкладки opacity
//      стрибала до 0.3, що теж давало мигання.
//
// Рішення:
//   • Стартуємо з opacity = 0 (повністю невидимий).
//   • У useFocusEffect синхронно скидаємо до 0, потім анімуємо до 1.
//   • У cleanup тільки зупиняємо анімацію — opacity лишається 1.
//     React Navigation сам ховає вкладку через display:none, тому
//     opacity:1 на схованій вкладці не призводить до артефактів.
//   • useNativeDriver: true — анімація крутиться на UI-потоці без JS-bridge.
//   • React.memo — запобігає зайвим ре-рендерам при навігації.
// ─────────────────────────────────────────────────────────────────────────────
const withTabAnimation = (WrappedComponent) => {
  const AnimatedScreen = React.memo((props) => {
    // Починаємо з 0 — екран невидимий при першому маунті.
    // Будь-яка затримка JS-потоку буде виглядати як "ще не появився",
    // а не як "мигнув і зник".
    const opacity = useRef(new Animated.Value(0)).current;
    const animRef = useRef(null);

    useFocusEffect(
      useCallback(() => {
        // Скасовуємо попередню анімацію, якщо юзер швидко перемикає вкладки
        if (animRef.current) {
          animRef.current.stop();
          animRef.current = null;
        }

        // Синхронний скид до 0 — відбувається до того,
        // як React Native малює наступний кадр
        opacity.setValue(0);

        // Плавна появa з Easing.out(Easing.ease) —
        // швидкий старт, плавне завершення, як у нативних iOS-переходах
        animRef.current = Animated.timing(opacity, {
          toValue: 1,
          duration: TAB_FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true, // UI-потік, без JS-bridge
        });

        animRef.current.start(({ finished }) => {
          if (finished) animRef.current = null;
        });

        return () => {
          // Тільки зупиняємо анімацію — НЕ скидаємо opacity.
          // Якщо скинути до 0.3 (як було раніше), вкладка мигає при
          // поверненні, бо стає видимою на 30% до початку анімації.
          if (animRef.current) {
            animRef.current.stop();
            animRef.current = null;
          }
        };
      }, []) // opacity і animRef — стабільні рефи, залежностей немає
    );

    return (
      // renderToHardwareTextureAndroid: анімація opacity виконується
      // через апаратний шар на Android — усуває "дьоргання" при первому показі
      <Animated.View
        style={{ flex: 1, opacity }}
        renderToHardwareTextureAndroid
      >
        <WrappedComponent {...props} />
      </Animated.View>
    );
  });

  AnimatedScreen.displayName = `Animated(${WrappedComponent.displayName || WrappedComponent.name || 'Screen'})`;
  return AnimatedScreen;
};

const AnimatedHomeScreen = withTabAnimation(HomeScreen);
const AnimatedGroceryListScreen = withTabAnimation(GroceryListScreen);
const AnimatedAnalyticsScreen = withTabAnimation(AnalyticsScreen);
const AnimatedSettingsScreen = withTabAnimation(SettingsScreen);

// ─────────────────────────────────────────────────────────────────────────────
// TabBarBackground — різний для iOS та Android.
//
// BlurView на Android викликає дорогу GPU-операцію кожен кадр і є
// основною причиною лагів при рендерингу. Натомість використовуємо
// звичайний View з напівпрозорим фоном, який виглядає майже так само.
// ─────────────────────────────────────────────────────────────────────────────
const TabBarBackground = ({ theme }) => {
  if (Platform.OS === 'android') {
    return (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: theme === 'dark'
              ? 'rgba(20, 20, 22, 0.97)'
              : 'rgba(252, 252, 252, 0.97)',
          },
        ]}
      />
    );
  }

  // iOS: нативний blur без experimentalBlurMethod (він не потрібен
  // і може спричиняти проблеми на деяких пристроях)
  return (
    <BlurView
      tint={theme === 'dark' ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
      intensity={60}
      style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden' }}
    />
  );
};

const MainTabs = () => {
  const { colors: COLORS, theme } = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          height: 90,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          // Прибираємо elevation на Android — воно взаємодіє з BlurView/
          // кастомним фоном і може давати артефакти рендерингу
          elevation: Platform.OS === 'android' ? 0 : 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarBackground: () => <TabBarBackground theme={theme} />,
        tabBarIcon: ({ size, focused }) => {
          if (route.name === 'AddButton') {
            return (
              <View style={styles.fabWrapper}>
                <View style={[styles.fabButton, { backgroundColor: COLORS.primary }]}>
                  <Ionicons name="add" size={36} color={COLORS.surface || '#fff'} />
                </View>
              </View>
            );
          }

          let iconName;
          if (route.name === 'Продукти') iconName = focused ? 'fast-food' : 'fast-food-outline';
          else if (route.name === 'Покупки') iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'Аналітика') iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          else if (route.name === 'Параметри') iconName = focused ? 'settings' : 'settings-outline';

          return (
            <View style={styles.tabItemContainer}>
              <View style={[styles.iconPill, focused && { backgroundColor: COLORS.primary }]}>
                <Ionicons
                  name={iconName}
                  size={size}
                  color={focused ? COLORS.primaryContainer : COLORS.textLight}
                />
              </View>
              <Text style={[styles.tabLabel, { color: focused ? COLORS.primary : COLORS.textLight }]}>
                {route.name}
              </Text>
            </View>
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
      })}
    >
      <Tab.Screen name="Продукти" component={AnimatedHomeScreen} />
      <Tab.Screen name="Покупки" component={AnimatedGroceryListScreen} />

      <Tab.Screen
        name="AddButton"
        component={AddProductScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('AddProduct');
          },
        })}
      />

      <Tab.Screen name="Аналітика" component={AnimatedAnalyticsScreen} />
      <Tab.Screen name="Параметри" component={AnimatedSettingsScreen} />
    </Tab.Navigator>
  );
};

export default function AppNavigator() {
  const { isAuthenticated, isInitializing, needsOnboarding, initialize } = useAuthStore();
  const { theme, colors: COLORS } = useThemeStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const navigationTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.text,
      primary: COLORS.primary,
      border: COLORS.border,
    },
  };

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerBackTitleVisible: false,
          headerShown: false,
          headerShadowVisible: false,
          headerTransparent: false,

          ...TransitionPresets.SlideFromRightIOS,
          cardStyle: { backgroundColor: COLORS.background },

          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : needsOnboarding ? (
          <Stack.Group screenOptions={{ headerShown: false, ...TransitionPresets.SlideFromRightIOS }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Diet" component={DietScreen} />
            <Stack.Screen name="Allergens" component={AllergensScreen} />
            <Stack.Screen name="Guide" component={GuideScreen} />
          </Stack.Group>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ headerShown: true, title: 'Додати продукт' }} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ headerShown: true, title: 'Сканувати', ...TransitionPresets.ModalSlideFromBottomIOS }} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Деталі продукту' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ headerShown: true, title: 'Історія споживання' }} />
            <Stack.Screen name="Рецепти" component={RecipesScreen} options={{ headerShown: true, title: 'Рецепти' }} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ headerShown: true, title: 'Досягнення' }} />
            <Stack.Screen name="Premium" component={PremiumScreen} options={{ headerShown: false, ...TransitionPresets.ModalPresentationIOS }} />
            <Stack.Screen name="Leagues" component={LeaguesScreen} options={{ headerShown: false, title: 'Ліги' }} />
            <Stack.Screen name="DietSettings" component={DietSettingsScreen} options={{ headerShown: true, title: 'Моя дієта' }} />
            <Stack.Screen name="AllergensSettings" component={AllergensSettingsScreen} options={{ headerShown: true, title: 'Мої алергени' }} />
            <Stack.Screen name="Categories" component={CategoriesScreen} options={{ headerShown: true, title: 'Мої категорії' }} />
            <Stack.Screen name="DailyTasks" component={DailyTasksScreen} options={{ headerShown: true, title: 'Завдання' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  fabWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});