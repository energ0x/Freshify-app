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

// Імпорти екранів
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_FADE_DURATION = Platform.select({
  ios: 160,
  android: 100,
  default: 130,
});

const withTabAnimation = (WrappedComponent) => {
  const AnimatedScreen = React.memo((props) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const animRef = useRef(null);

    useFocusEffect(
      useCallback(() => {
        if (animRef.current) {
          animRef.current.stop();
          animRef.current = null;
        }

        opacity.setValue(0);

        animRef.current = Animated.timing(opacity, {
          toValue: 1,
          duration: TAB_FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        });

        animRef.current.start(({ finished }) => {
          if (finished) animRef.current = null;
        });

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

const AnimatedHomeScreen = withTabAnimation(HomeScreen);
const AnimatedGroceryListScreen = withTabAnimation(GroceryListScreen);
const AnimatedAnalyticsScreen = withTabAnimation(AnalyticsScreen);
const AnimatedSettingsScreen = withTabAnimation(SettingsScreen);

// ─────────────────────────────────────────────────────────────────────────────
// Custom Tab Bar Background з тінями та заокругленням
// ─────────────────────────────────────────────────────────────────────────────
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
          elevation: 0, // Тіні перенесені у TabBarBackground
        },
        tabBarBackground: () => <TabBarBackground theme={theme} colors={COLORS} />,
        tabBarIcon: ({ size, focused }) => {
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

      <Tab.Screen
        name="AddButton"
        component={AddProductScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("AddProduct");
          },
        })}
      />

      <Tab.Screen name="Analytics" component={AnimatedAnalyticsScreen} />
      <Tab.Screen name="Profile" component={AnimatedSettingsScreen} />
    </Tab.Navigator>
  );
};

export default function AppNavigator() {
  const { t } = useTranslation();
  const { isAuthenticated, isInitializing, needsOnboarding, initialize } = useAuthStore();
  const { theme, colors: COLORS } = useThemeStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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
          headerTitleStyle: { fontWeight: "700" }, // Трохи жирніший текст хедерів для Stack-екранів
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : needsOnboarding ? (
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
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="AddProduct"
              component={AddProductScreen}
              options={{ headerShown: true, title: t("screens.addProduct") }}
            />
            <Stack.Screen
              name="Camera"
              component={CameraScreen}
              options={{
                headerShown: true,
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
              options={{ headerShown: true, title: t("screens.history") }}
            />
            <Stack.Screen
              name="Recipes"
              component={RecipesScreen}
              options={{ headerShown: false, title: t("screens.recipes") }}
            />
            <Stack.Screen
              name="Achievements"
              component={AchievementsScreen}
              options={{ headerShown: true, title: t("screens.achievements") }}
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
              options={{ headerShown: true, title: t("screens.dietSettings") }}
            />
            <Stack.Screen
              name="AllergensSettings"
              component={AllergensSettingsScreen}
              options={{
                headerShown: true,
                title: t("screens.allergensSettings"),
              }}
            />
            <Stack.Screen
              name="Categories"
              component={CategoriesScreen}
              options={{ headerShown: true, title: t("screens.categories") }}
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
    overflow: "hidden", // Гарантує, що BlurView не вилізе за межі заокруглених кутів
  },
  tabItemContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: Platform.OS === 'android' ? 4 : 8,
  },
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
  fabWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Platform.OS === 'android' ? -4 : 0,
  },
  fabButton: {
    width: 64, // Підігнано під загальний стиль інпутів/кнопок
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