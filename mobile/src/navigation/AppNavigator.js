import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { colors: COLORS } = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 90,
          borderTopWidth: 0,
          backgroundColor: COLORS.surface,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Продукти') iconName = focused ? 'fast-food' : 'fast-food-outline';
          else if (route.name === 'Покупки') iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'Рецепти') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'Аналітика') iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          else if (route.name === 'Параметри') iconName = focused ? 'settings' : 'settings-outline';

          return (
            <View style={styles.tabItemContainer}>
              <View style={[styles.iconPill, focused && { backgroundColor: COLORS.primaryContainer }]}>
                <Ionicons name={iconName} size={size} color={focused ? COLORS.onPrimaryContainer : COLORS.textLight} />
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
      <Tab.Screen name="Рецепти" component={RecipesScreen} />
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
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ headerShown: true, title: 'Додати продукт' }} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ headerShown: true, title: 'Сканувати' }} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Деталі продукту' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ headerShown: true, title: 'Історія споживання' }} />
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
});