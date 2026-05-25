import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import DietScreen from '../screens/onboarding/DietScreen';
import AllergensScreen from '../screens/onboarding/AllergensScreen';
import GuideScreen from '../screens/onboarding/GuideScreen';

const Stack = createStackNavigator();

export default function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Diet" component={DietScreen} />
      <Stack.Screen name="Allergens" component={AllergensScreen} />
      <Stack.Screen name="Guide" component={GuideScreen} />
    </Stack.Navigator>
  );
}