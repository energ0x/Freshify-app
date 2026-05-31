import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from "expo-blur";
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarBackground: () => (
          <BlurView
            experimentalBlurMethod="dimezisBlurView"
            tint={theme === 'dark' ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
            intensity={60}
            style={{
              ...StyleSheet.absoluteFillObject,
              overflow: 'hidden',
            }}
          />
        ),
        tabBarIcon: ({ color, size, focused }) => {
          // СПЕЦІАЛЬНИЙ РЕНДЕР ДЛЯ ЦЕНТРАЛЬНОЇ КНОПКИ "+"
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
                <Ionicons name={iconName} size={size} color={focused ? COLORS.primaryContainer : COLORS.textLight} />
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
      <Tab.Screen name="Продукти" component={HomeScreen} />
      <Tab.Screen name="Покупки" component={GroceryListScreen} />
      
      <Tab.Screen 
        name="AddButton" 
        component={AddProductScreen} // Пуста заглушка
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('AddProduct');
          },
        })}
      />

      <Tab.Screen name="Аналітика" component={AnalyticsScreen} />
      <Tab.Screen name="Параметри" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default function AppNavigator() {
  const { isAuthenticated, isInitializing, needsOnboarding, initialize } = useAuthStore();
  const { theme, colors: COLORS } = useThemeStore();

  useEffect(() => {
    initialize();
  }, []);

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
          animation: 'slide_from_right',
          headerTransparent: false,
          contentStyle: { backgroundColor: COLORS.background },
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '600' }
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : needsOnboarding ? (
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Diet" component={DietScreen} />
            <Stack.Screen name="Allergens" component={AllergensScreen} />
            <Stack.Screen name="Guide" component={GuideScreen} />
          </Stack.Group>
        ) : (
          <>
          {/* options={{ headerShown: true, title: 'Мої продукти'        цю штуку можна додати вниз і буде відступ*/}
            <Stack.Screen name="Main" component={MainTabs}/>
            <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ headerShown: true, title: 'Додати продукт' }} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ headerShown: true, title: 'Сканувати' }} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Деталі продукту' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ headerShown: true, title: 'Історія споживання' }} />
            <Stack.Screen name="Рецепти" component={RecipesScreen} options={{ headerShown: true, title: 'Рецепти' }} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ headerShown: true, title: 'Досягнення' }} />
            <Stack.Screen name="Premium" component={PremiumScreen} options={{ headerShown: false, presentation: 'modal', title: 'Premium'}} />
            <Stack.Screen name="Leagues" component={LeaguesScreen} options={{ headerShown: false, title: 'Leagues'}} />

            <Stack.Screen name="DietSettings" component={DietSettingsScreen} options={{ headerShown: true, title: 'Моя дієта'}} />
            <Stack.Screen name="AllergensSettings" component={AllergensSettingsScreen} options={{ headerShown: true, title: 'Мої алергени'}} />
            <Stack.Screen name="Categories" component={CategoriesScreen} options={{ headerShown: true, title: 'Мої категорії'}} />
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
    // top: -24,
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
  }
});