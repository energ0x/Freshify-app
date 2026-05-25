// src/navigation/OnboardingStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import OnboardingScreen from '../screens/OnboardingScreen';

// import WelcomeScreen from '../screens/WelcomeScreen';
// import QuestionOneScreen from '../screens/QuestionOneScreen';
// import QuestionTwoScreen from '../screens/QuestionTwoScreen';

const Stack = createStackNavigator();

export default function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      {/* <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="QuestionOne" component={QuestionOneScreen} />
      <Stack.Screen name="QuestionTwo" component={QuestionTwoScreen} /> */}
    </Stack.Navigator>
  );
}