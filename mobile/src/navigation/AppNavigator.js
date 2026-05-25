import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import { COLORS } from '../utils/constants';

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
import OnboardingStack from '../screens/OnboardingStack';
import HistoryScreen from '../screens/HistoryScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === 'Холодильник') iconName = 'fast-food-outline';
        else if (route.name === 'Покупки') iconName = 'cart-outline';
        else if (route.name === 'Рецепти') iconName = 'restaurant-outline';
        else if (route.name === 'Аналітика') iconName = 'pie-chart-outline';
        else if (route.name === 'Налаштування') iconName = 'settings-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textLight,
    })}
  >
    <Tab.Screen name="Холодильник" component={HomeScreen} />
    <Tab.Screen name="Покупки" component={GroceryListScreen} />
    <Tab.Screen name="Рецепти" component={RecipesScreen} />
    <Tab.Screen name="Аналітика" component={AnalyticsScreen} />
    <Tab.Screen name="Налаштування" component={SettingsScreen} />
  </Tab.Navigator>
);

export default function AppNavigator() {
  const { isAuthenticated, isInitializing, needsOnboarding, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : needsOnboarding ? (
          <Stack.Screen name="OnboardingFlow" component={OnboardingStack} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ headerShown: true, title: 'Додати продукт' }} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Деталі' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ headerShown: true, title: 'Історія споживання' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}