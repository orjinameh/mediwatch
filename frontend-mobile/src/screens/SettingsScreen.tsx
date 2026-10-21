import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PURPLE, PURPLE_DARK } from '../theme';
import Icon from '../components/Icon';

export default function SettingsScreen({ navigation }: any) {
  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('doctor').then(d => { if (d) { try { setDoctor(JSON.parse(d).user); } catch (_) {} } });
  }, []);

  const logout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('doctor');
          // Login lives in the root stack, one level above the tabs
          (navigation.getParent() || navigation).reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Doctor profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Icon name="stethoscope" size={30} color={PURPLE} />
          </View>
          <View>
            <Text style={styles.profileName}>{doctor?.name || ''}</Text>
            <Text style={styles.profileEmail}>{doctor?.email || ''}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{doctor?.role ? doctor.role.charAt(0).toUpperCase() + doctor.role.slice(1) : 'Staff'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.item}>
            <View style={styles.itemIcon}><Icon name="info" size={22} color={PURPLE} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemLabel}>About MediWatch AI</Text>
              <Text style={styles.itemSub}>Version 1.0.0 · IoT Patient Monitor</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5FF' },
  header: { backgroundColor: PURPLE_DARK, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  title: { color: 'white', fontSize: 24, fontWeight: '700' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'white', margin: 16, borderRadius: 20, padding: 20, shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: PURPLE + '20', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 2 },
  profileEmail: { fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  roleBadge: { backgroundColor: PURPLE + '15', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, color: PURPLE, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: PURPLE + '15', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 2 },
  itemSub: { fontSize: 12, color: '#9CA3AF' },
  logoutBtn: { backgroundColor: '#FEE2E2', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});
