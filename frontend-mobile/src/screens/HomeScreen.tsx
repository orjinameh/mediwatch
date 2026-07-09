import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PURPLE, PURPLE_DARK, STATUS_COLORS, news2Color } from '../theme';
import { apiFetch, useWebSocket } from '../hooks/useApi';

export default function HomeScreen({ navigation }: any) {
  const [doctor, setDoctor] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { connected, vitalsMap, alerts } = useWebSocket();

  useEffect(() => {
    loadDoctor();
    loadPatients();
  }, []);

  const loadDoctor = async () => {
    const stored = await AsyncStorage.getItem('doctor');
    if (stored) setDoctor(JSON.parse(stored));
  };

  const loadPatients = async () => {
    try {
      const res = await apiFetch('/api/patients');
      if (res.success) setPatients(res.data);
    } catch (_) {}
    setLoading(false);
  };

  const getHour = () => new Date().getHours();
  const greeting = getHour() < 12 ? 'Good Morning,' : getHour() < 17 ? 'Good Afternoon,' : 'Good Evening,';

  const needAttention = patients.filter(p => {
    const v = vitalsMap[p.patientId] || p.latestVitals;
    return v?.news2Level === 'HIGH' || v?.news2Level === 'CRITICAL';
  });
  const normal = patients.length - needAttention.length;

  const getStatus = (p: any) => {
    const v = vitalsMap[p.patientId] || p.latestVitals;
    return v?.news2Level === 'HIGH' || v?.news2Level === 'CRITICAL' ? 'attention' : 'stable';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Purple header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.doctorName}>{doctor?.name || 'Dr. Obed'}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.liveDot, { backgroundColor: connected ? '#4ADE80' : '#9CA3AF' }]} />
              <TouchableOpacity onPress={() => navigation.navigate('Patients')} style={styles.bellWrap}>
                <Text style={styles.bell}>🔔</Text>
                {alerts.length > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{alerts.length}</Text></View>
                )}
              </TouchableOpacity>
              <View style={styles.avatar}><Text style={{ fontSize: 22 }}>👨‍⚕️</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.content}>

          {/* Overview */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Overview</Text>
              <Text style={styles.cardSub}>Today ▾</Text>
            </View>
            <View style={styles.statsRow}>
              {[
                { icon: '👥', label: 'Total patients', value: patients.length, color: PURPLE },
                { icon: '⚠️', label: 'Need Attention', value: needAttention.length, color: '#F59E0B' },
                { icon: '✅', label: 'Normal', value: normal, color: '#16A34A' },
              ].map(({ icon, label, value, color }) => (
                <View key={label} style={styles.statBox}>
                  <Text style={styles.statIcon}>{icon}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={[styles.statValue, { color }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Needs attention */}
          {needAttention.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Patients needing attention</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Patients')}>
                  <Text style={[styles.cardSub, { color: PURPLE }]}>View all</Text>
                </TouchableOpacity>
              </View>
              {needAttention.slice(0, 3).map(p => {
                const v = vitalsMap[p.patientId] || p.latestVitals;
                return (
                  <TouchableOpacity key={p._id} style={styles.patientRow}
                    onPress={() => navigation.navigate('PatientDetail', { patientId: p.patientId })}>
                    <View style={[styles.patientAvatar, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={{ fontSize: 20 }}>❤️</Text>
                    </View>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>{p.name}</Text>
                      <Text style={styles.patientSub}>High heart rate</Text>
                    </View>
                    <Text style={[styles.patientValue, { color: news2Color(v?.news2Score || 0) }]}>
                      {v?.heartRate ? `${Math.round(v.heartRate)}bpm` : '—'}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Recent updates */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent patients updates</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Patients')}>
                <Text style={[styles.cardSub, { color: PURPLE }]}>View all</Text>
              </TouchableOpacity>
            </View>
            {loading ? <ActivityIndicator color={PURPLE} /> :
              patients.slice(0, 4).map(p => {
                const sk = getStatus(p);
                const st = STATUS_COLORS[sk as keyof typeof STATUS_COLORS];
                return (
                  <TouchableOpacity key={p._id} style={styles.patientRow}
                    onPress={() => navigation.navigate('PatientDetail', { patientId: p.patientId })}>
                    <View style={[styles.patientAvatar, { backgroundColor: PURPLE + '20' }]}>
                      <Text style={{ fontSize: 20 }}>👤</Text>
                    </View>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>{p.name}</Text>
                      <Text style={styles.patientSub}>Vitals {sk}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.text }]}>
                        {sk.charAt(0).toUpperCase() + sk.slice(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            }
            {patients.length === 0 && !loading && (
              <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>
                No patients yet
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5FF' },
  header: { backgroundColor: PURPLE_DARK, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 2 },
  doctorName: { color: 'white', fontSize: 22, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  bellWrap: { position: 'relative' },
  bell: { fontSize: 22 },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  content: { padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 13, color: '#9CA3AF' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 14, padding: 12 },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 4, textAlign: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  patientAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 2 },
  patientSub: { fontSize: 12, color: '#9CA3AF' },
  patientValue: { fontSize: 15, fontWeight: '700' },
  chevron: { fontSize: 20, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
});
