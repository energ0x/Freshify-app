/**
 * @file AppNavigator.js
 * @description Central navigation controller of the Freshify application.
 * Manages the transition flow between Authentication screens, Onboarding screens,
 * and the Main tab-based application screens. Configures theme-aware styling, custom tab bar layouts,
 * and entry points for modal and stacked screens.
 */

import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useFocusEffect,
} from "@react-navigation/native";
import {
  createStackNavigator,
  TransitionPresets,
} from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../store/authStore";
import useThemeStore from "../store/themeStore";
import { useTranslation } from "react-i18next";

// Screen components imports
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import AddProductScreen from "../screens/AddProductScreen";
import CameraScreen from "../screens/CameraScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import GroceryListScreen from "../screens/GroceryListScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import RecipesScreen from "../screens/RecipesScreen";
import SettingsScreen from "../screens/SettingsScreen";
import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import DietScreen from "../screens/onboarding/DietScreen";
import AllergensScreen from "../screens/onboarding/AllergensScreen";
import GuideScreen from "../screens/onboarding/GuideScreen";
import HistoryScreen from "../screens/HistoryScreen";
import AchievementsScreen from "../screens/AchievementsScreen";
import PremiumScreen from "../screens/PremiumScreen";
import LeaguesScreen from "../screens/LeaguesScreen";
import DietSettingsScreen from "../screens/DietSettingsScreen";
import AllergensSettingsScreen from "../screens/AllergensSettingsScreen";
import CategoriesScreen from "../screens/CategoriesScreen";
import DailyTasksScreen from "../screens/DailyTasksScreen";
import ProductFiltersScreen from "../screens/ProductFiltersScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import EditProductScreen from "../screens/EditProductScreen";

// Create Stack and Bottom Tab Navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Duration for transition animations on bottom tabs, customized by operating system.
const TAB_FADE_DURATION = Platform.select({
  ios: 160,
  android: 100,
  default: 130,
});

/**
 * Higher-Order Component (HOC) that wraps screens in bottom navigation with a smooth fade-in animation
 * triggered whenever the tab screen comes into focus.
 * 
 * @param {React.ComponentType} WrappedComponent - The screen component to animate.
 * @returns {React.ComponentType} The wrapped component with animated opacity.
 */
const withTabAnimation = (WrappedComponent) => {
  const AnimatedScreen = React.memo((props) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const animRef = useRef(null);

    useFocusEffect(
      useCallback(() => {
        // Stop any currently running animation instance
        if (animRef.current) {
          animRef.current.stop();
          animRef.current = null;
        }

        // Reset opacity value
        opacity.setValue(0);

        // Run fade-in animation
        animRef.current = Animated.timing(opacity, {
          toValue: 1,
          duration: TAB_FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        });

        animRef.current.start(({ finished }) => {
          if (finished) animRef.current = null;
        });

        // Clean up animation on blur/unmount
        return () => {
          if (animRef.current) {
            animRef.current.stop();
            animRef.current = null;
          }
        };
      }, [opacity]),
    );

    return (
      <Animated.View
        style={{ flex: 1, opacity }}
        renderToHardwareTextureAndroid
      >
        <WrappedComponent {...props} />
      </Animated.View>
    );
  });

  AnimatedScreen.displayName = `Animated(${WrappedComponent.displayName || WrappedComponent.name || "Screen"})`;
  return AnimatedScreen;
};

// Animated versions of primary bottom tab screens to prevent screen flicker and smooth navigation.
const AnimatedHomeScreen = withTabAnimation(HomeScreen);
const AnimatedGroceryListScreen = withTabAnimation(GroceryListScreen);
const AnimatedAnalyticsScreen = withTabAnimation(AnalyticsScreen);
const AnimatedSettingsScreen = withTabAnimation(SettingsScreen);

// ─────────────────────────────────────────────────────────────────────────────
// Custom Tab Bar Background component with shadows and rounded borders
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Custom background component for the bottom tab bar.
 * Uses a BlurView on iOS for transparency/glassmorphism, and a semi-opaque solid color on Android.
 * 
 * @param {object} props - Component properties.
 * @param {string} props.theme - The current system theme ('dark' | 'light').
 * @param {object} props.colors - Current color scheme configuration.
 */
const TabBarBackground = ({ theme, colors }) => {
  const isDark = theme === "dark";
  const androidColor = isDark ? "rgba(30, 30, 34, 0.98)" : "rgba(252, 252, 252, 0.98)";

  return (
    <View style={styles.tabBackgroundContainer}>
      <View style={styles.tabBackgroundInner}>
        {Platform.OS === "android" ? (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: androidColor }]} />
        ) : (
          <BlurView
            tint={isDark ? "systemThickMaterialDark" : "systemThickMaterialLight"}
            intensity={80}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>
    </View>
  );
};

/**
 * Bottom Tab Navigation flow container.
 * Houses the primary screens: Products List, Grocery Shopping List, quick Add FAB, Analytics, and Settings Profile.
 * 
 * @returns {React.JSX.Element} Bottom Tab Navigator configuration.
 */
const MainTabs = () => {
  const { colors: COLORS, theme } = useThemeStore();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          height: Platform.OS === 'ios' ? 90 : 80,
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0, // Shadow handling is offloaded to the TabBarBackground wrapper
        },
        tabBarBackground: () => <TabBarBackground theme={theme} colors={COLORS} />,
        tabBarIcon: ({ size, focused }) => {
          // Unique rendering for the center FAB (Floating Action Button) action.
          if (route.name === "AddButton") {
            return (
              <View style={styles.fabWrapper}>
                <View style={[styles.fabButton, { backgroundColor: COLORS.primary }]}>
                  <Ionicons
                    name="add"
                    size={32}
                    color={COLORS.onPrimary}
                  />
                </View>
              </View>
            );
          }

          let iconName;
          let labelText = "";

          // Assign corresponding icons and localized labels to standard tabs.
          if (route.name === "Products") {
            iconName = focused ? "fast-food" : "fast-food-outline";
            labelText = t("tabs.products");
          } else if (route.name === "Grocery") {
            iconName = focused ? "cart" : "cart-outline";
            labelText = t("tabs.grocery");
          } else if (route.name === "Analytics") {
            iconName = focused ? "pie-chart" : "pie-chart-outline";
            labelText = t("tabs.analytics");
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
            labelText = t("tabs.profile");
          }

          return (
            <View style={styles.tabItemContainer}>
              <View
                style={[
                  styles.iconPill,
                  focused && { backgroundColor: COLORS.primaryContainer },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={24}
                  color={focused ? COLORS.onPrimaryContainer : COLORS.onSurfaceVariant}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? COLORS.onPrimaryContainer : COLORS.onSurfaceVariant },
                  focused && styles.tabLabelActive
                ]}
              >
                {labelText}
              </Text>
            </View>
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.onSurfaceVariant,
      })}
    >
      <Tab.Screen name="Products" component={AnimatedHomeScreen} />
      <Tab.Screen name="Grocery" component={AnimatedGroceryListScreen} />

      {/* Center FAB Tab - Intercepted to trigger stack navigation instead of mounting a tab screen */}
      <Tab.Screen
        name="AddButton"
        component={AddProductScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault(); // Prevents loading the default empty screen
            navigation.navigate("AddProduct");
          },
        })}
      />

      <Tab.Screen name="Analytics" component={AnimatedAnalyticsScreen} />
      <Tab.Screen name="Profile" component={AnimatedSettingsScreen} />
    </Tab.Navigator>
  );
};

/**
 * Main Application Navigator.
 * Orchestrates authorization gates, onboarding status, and app navigation structures.
 * 
 * @returns {React.JSX.Element} Navigation container populated with dynamic screen stacks.
 */
export default function AppNavigator() {
  const { t } = useTranslation();
  const { isAuthenticated, isInitializing, needsOnboarding, initialize } = useAuthStore();
  const { theme, colors: COLORS } = useThemeStore();

  // Initialize authorization details on startup.
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Establish standard styles and colors based on Light/Dark themes for React Navigation.
  const navigationTheme = {
    ...(theme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.text,
      primary: COLORS.primary,
      border: COLORS.border,
    },
  };

  // Display a loading indicator while parsing user login status.
  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.background,
        }}
      >
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
          headerTitleStyle: { fontWeight: "700" }, // Slightly bolder headers for stack views
        }}
      >
        {!isAuthenticated ? (
          // Authorization Gateway: Loaded if user is not authenticated.
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : needsOnboarding ? (
          // Onboarding Flow Stack: Displayed immediately after registration.
          <Stack.Group
            screenOptions={{
              headerShown: false,
              ...TransitionPresets.SlideFromRightIOS,
            }}
          >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Diet" component={DietScreen} />
            <Stack.Screen name="Allergens" component={AllergensScreen} />
            <Stack.Screen name="Guide" component={GuideScreen} />
          </Stack.Group>
        ) : (
          // Core Application Flow: Accessed after successful authentication & onboarding.
          <>
            {/* Contains the Bottom Tab Bar screens */}
            <Stack.Screen name="Main" component={MainTabs} />
            
            {/* Separate Stack-Based Screens for detail actions, settings, camera, and options */}
            <Stack.Screen
              name="AddProduct"
              component={AddProductScreen}
              options={{ headerShown: false, title: t("screens.addProduct") }}
            />
            <Stack.Screen
              name="Camera"
              component={CameraScreen}
              options={{
                headerShown: false,
                title: t("screens.scan"),
                ...TransitionPresets.ModalSlideFromBottomIOS,
              }}
            />
            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={{ headerShown: false, title: t("screens.productDetail") }}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{ headerShown: false, title: t("screens.history") }}
            />
            <Stack.Screen
              name="Recipes"
              component={RecipesScreen}
              options={{ headerShown: false, title: t("screens.recipes") }}
            />
            <Stack.Screen
              name="Achievements"
              component={AchievementsScreen}
              options={{ headerShown: false, title: t("screens.achievements") }}
            />
            <Stack.Screen
              name="Premium"
              component={PremiumScreen}
              options={{
                headerShown: false,
                ...TransitionPresets.ModalPresentationIOS,
              }}
            />
            <Stack.Screen
              name="Leagues"
              component={LeaguesScreen}
              options={{ headerShown: false, title: t("screens.leagues") }}
            />
            <Stack.Screen
              name="DietSettings"
              component={DietSettingsScreen}
              options={{ headerShown: false, title: t("screens.dietSettings") }}
            />
            <Stack.Screen
              name="AllergensSettings"
              component={AllergensSettingsScreen}
              options={{
                headerShown: false,
                title: t("screens.allergensSettings"),
              }}
            />
            <Stack.Screen
              name="Categories"
              component={CategoriesScreen}
              options={{ headerShown: false, title: t("screens.categories") }}
            />
            <Stack.Screen
              name="DailyTasks"
              component={DailyTasksScreen}
              options={{ headerShown: false, title: t("screens.dailyTasks") }}
            />
            <Stack.Screen
              name="ProductFilters"
              component={ProductFiltersScreen}
              options={{
                headerShown: false,
                ...TransitionPresets.ModalPresentationIOS,
              }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                headerShown: false,
                ...TransitionPresets.ModalPresentationIOS,
              }}
            />
            <Stack.Screen
              name="EditProduct"
              component={EditProductScreen}
              options={{
                headerShown: false,
                title: t("screens.editProduct"),
                ...TransitionPresets.ModalPresentationIOS,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // Shadow and container configurations for custom glassmorphism style on tab bar
  tabBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabBackgroundInner: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden", // Keeps BlurView within rounded container limits
  },
  // Container wrapper styling for specific navigation tabs
  tabItemContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: Platform.OS === 'android' ? 4 : 8,
  },
  // Background pill overlay visible when the tab is actively focused
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  tabLabelActive: {
    fontWeight: "700",
  },
  // Wrapper for the action Floating Action Button
  fabWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Platform.OS === 'android' ? -4 : 0,
  },
  // Custom button styling for the center quick-add action
  fabButton: {
    width: 64, 
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});