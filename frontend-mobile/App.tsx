import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { PURPLE_DARK } from './src/theme';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />
      <AppNavigator />
    </>
  );
}
