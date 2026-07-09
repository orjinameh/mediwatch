import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { PURPLE, PURPLE_DARK, STATUS_COLORS } from '../theme';
import { apiFetch, useWebSocket } from '../hooks/useApi';

export default function PatientsScreen({ navigation }: any) {
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { vitalsMap, alerts } = useWebSocket();

  useEffect(() => { loadPatients(); }, []);

  const loadPatients = async () => {
    try {
      const res = await apiFetch('/api/patients');
      if (res.success) setPatients(res.data);
    } catch (_) {}
    setLoading(false);
  };

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.patientId?.toLowerCase().includes(search.toLowerCase()) ||
    p.ward?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (p: any) => {
    const v = vitalsMap[p.patientId] || p.latestVitals;
    return v?.news2Level === 'HIGH' || v?.news2Level === 'CRITICAL' ? 'attention' : 'stable';
  };

  const renderPatient = ({ item: p }: any) => {
    const v = vitalsMap[p.patientId] || p.latestVitals;
    const sk = getStatus(p);
    const st = STATUS_COLORS[sk as keyof typeof STATUS_COLORS];
    return (
      <TouchableOpacity style={styles.patientCard}
        onPress={() => navigation.navigate('PatientDetail', { patientId: p.patientId })}>
        <View style={[styles.avatar, { backgroundColor: PURPLE + '20' }]}>
          <Text style={{ fontSize: 22 }}>👤</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={styles.sub}>{p.age || '—'} Years · Room {p.patientId?.slice(-3)}</Text>
          <Text style={styles.vitalsText}>
            HR {v?.heartRate ? Math.round(v.heartRate) : '—'}{'  '}
            SpO2 {v?.spo2 ? v.spo2.toFixed(0) : '—'}%{'  '}
            Temp {v?.temperature ? v.temperature.toFixed(1) : '—'} C
          </Text>
        </View>
        <View style={styles.right}>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.text }]}>
              {sk.charAt(0).toUpperCase() + sk.slice(1)}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Patients</Text>
          <View style={{ position: 'relative' }}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
            {alerts.length > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{alerts.length}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients by name, ID or room"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={PURPLE} style={{ marginTop: 60 }} />
      ) : filtered.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 80, marginBottom: 16 }}>📋</Text>
          <Text style={styles.emptyTitle}>No Patients yet</Text>
          <Text style={styles.emptySub}>Add your first patient and start{'\n'}monitoring their vitals</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add Patients</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p._id}
          renderItem={renderPatient}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <TouchableOpacity style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add Patients</Text>
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5FF' },
  header: { backgroundColor: PURPLE_DARK, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: 'white', fontSize: 24, fontWeight: '700' },
  alertBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  alertBadgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 14, color: '#111' },
  list: { padding: 16 },
  patientCard: { backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 2 },
  sub: { fontSize: 12, color: '#9CA3AF', marginBottom: 3 },
  vitalsText: { fontSize: 11, color: '#9CA3AF' },
  right: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 20, color: '#9CA3AF' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: PURPLE, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 28 },
  addBtn: { backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center', margin: 16 },
  addBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
});
