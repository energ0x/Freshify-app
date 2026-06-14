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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// Тривалість анімації по платформах.
// ─────────────────────────────────────────────────────────────────────────────
const TAB_FADE_DURATION = Platform.select({
  ios: 160,
  android: 100,
  default: 130,
});

// ─────────────────────────────────────────────────────────────────────────────
// withTabAnimation — HOC для плавного fade-in при переключенні вкладок.
// ─────────────────────────────────────────────────────────────────────────────
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
      }, []),
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
// TabBarBackground
// ─────────────────────────────────────────────────────────────────────────────
const TabBarBackground = ({ theme }) => {
  if (Platform.OS === "android") {
    return (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor:
              theme === "dark"
                ? "rgba(20, 20, 22, 0.97)"
                : "rgba(252, 252, 252, 0.97)",
          },
        ]}
      />
    );
  }

  return (
    <BlurView
      tint={
        theme === "dark"
          ? "systemThickMaterialDark"
          : "systemThickMaterialLight"
      }
      intensity={60}
      style={{ ...StyleSheet.absoluteFillObject, overflow: "hidden" }}
    />
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
          height: 90,
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: Platform.OS === "android" ? 0 : 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarBackground: () => <TabBarBackground theme={theme} />,
        tabBarIcon: ({ size, focused }) => {
          if (route.name === "AddButton") {
            return (
              <View style={styles.fabWrapper}>
                <View
                  style={[
                    styles.fabButton,
                    { backgroundColor: COLORS.primary },
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={36}
                    color={COLORS.surface || "#fff"}
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
                  focused && { backgroundColor: COLORS.primary },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={size}
                  color={focused ? COLORS.primaryContainer : COLORS.textLight}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? COLORS.primary : COLORS.textLight },
                ]}
              >
                {labelText}
              </Text>
            </View>
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
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
  const { isAuthenticated, isInitializing, needsOnboarding, initialize } =
    useAuthStore();
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
          headerTitleStyle: { fontWeight: "600" },
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
              options={{ headerShown: true, title: t("screens.productDetail") }}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{ headerShown: true, title: t("screens.history") }}
            />
            <Stack.Screen
              name="Recipes"
              component={RecipesScreen}
              options={{ headerShown: true, title: t("screens.recipes") }}
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
              options={{ headerShown: true, title: t("screens.dailyTasks") }}
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabItemContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  fabWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});