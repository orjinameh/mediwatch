import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { PURPLE, PURPLE_DARK } from '../theme';
import Icon from '../components/Icon';
import { getSession } from '../hooks/useApi';

import LoginScreen       from '../screens/LoginScreen';
import HomeScreen        from '../screens/HomeScreen';
import PatientsScreen    from '../screens/PatientsScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';
import SettingsScreen    from '../screens/SettingsScreen';
import AddPatientScreen  from '../screens/AddPatientScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: 'home', Patients: 'users', Settings: 'settings',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Icon name={TAB_ICONS[name]} size={20} color={focused ? 'white' : '#6B7280'} />
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: PURPLE,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}>
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Patients" component={PatientsStack} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Patients stack — list + detail inside the tab
function PatientsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PatientsList"  component={PatientsScreen} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
      <Stack.Screen name="AddPatient"    component={AddPatientScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  // Restore an existing session instead of always showing the login screen
  const [initial, setInitial] = useState<'Login' | 'Main' | null>(null);
  useEffect(() => { getSession().then(s => setInitial(s?.token ? 'Main' : 'Login')); }, []);
  if (!initial) {
    return (
      <View style={{ flex: 1, backgroundColor: PURPLE_DARK, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initial}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main"  component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'white',
    borderTopColor: '#F3F4F6',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 20,
    height: 76,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  tabLabel: { fontSize: 11, marginTop: 2 },
  tabIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  tabIconActive: { backgroundColor: PURPLE },
});
