import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { PURPLE, PURPLE_DARK, news2Color, isStale } from '../theme';
import { apiFetch, useWebSocket, useNow } from '../hooks/useApi';
import Icon from '../components/Icon';
import Markdown from '../components/Markdown';

const VitalCard = ({ icon, label, value, unit, sub, color }: any) => (
  <View style={styles.vitalCard}>
    <View style={styles.vitalHeader}>
      <Icon name={icon} size={22} color={color || PURPLE} />
      <Text style={styles.vitalLabel}>{label}</Text>
    </View>
    <Text style={[styles.vitalValue, { color: color || '#111' }]}>{value}</Text>
    {unit && <Text style={[styles.vitalUnit, { color: color || PURPLE }]}>{unit}</Text>}
    {sub && <Text style={styles.vitalSub}>{sub}</Text>}
  </View>
);

export default function PatientDetailScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const [patient, setPatient] = useState<any>(null);
  const [vitals, setVitals] = useState<any>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const { vitalsMap, subscribe } = useWebSocket();
  const now = useNow(1000);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadData();
    subscribe(patientId);
  }, [patientId]);

  useEffect(() => {
    if (vitalsMap[patientId]) setVitals(vitalsMap[patientId]);
  }, [vitalsMap, patientId]);

  const loadData = async () => {
    try {
      const [pRes, vRes] = await Promise.all([
        apiFetch(`/api/patients/${patientId}`),
        apiFetch(`/api/vitals/${patientId}/latest`),
      ]);
      if (pRes.success) setPatient(pRes.data); else setLoadError(pRes.error || 'Could not load patient');
      if (vRes.success) setVitals(vRes.data);
    } catch (_) { setLoadError('Could not load patient'); }
  };

  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await apiFetch(`/api/ai/${patientId}`, {
        method: 'POST',
        body: JSON.stringify({ query: aiQuery, askedBy: 'nurse' }),
      });
      if (res.success) setAiResponse(res.data.response);
      else Alert.alert('Error', res.error || 'Failed to get AI response');
    } catch {
      Alert.alert('Error', 'Connection error');
    }
    setAiLoading(false);
  };

  const offline = isStale(vitals, now);
  const V = offline ? null : vitals;
  const nc = V ? news2Color(V.news2Score || 0) : '#9CA3AF';

  if (!patient) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        {loadError
          ? <>
              <Text style={{ color: '#B91C1C', textAlign: 'center', marginBottom: 12 }}>{loadError}</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: PURPLE, fontWeight: '600' }}>Go back</Text></TouchableOpacity>
            </>
          : <ActivityIndicator color={PURPLE} size="large" />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Purple header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrowLeft" size={20} color="white" />
          </TouchableOpacity>
          <View style={styles.patientHeaderRow}>
            <View style={styles.avatar}>
              <Icon name="user" size={26} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientMeta}>
                {patient.age || '—'} Years • {patient.gender || 'Unknown'}
              </Text>
              <Text style={styles.patientRoom}>
                {patient.ward || 'Ward'}{patient.roomNumber ? ` · Room ${patient.roomNumber}` : ''} · ID {patient.patientId}
              </Text>
              <View style={styles.headerBottom}>
                <Text style={styles.monitorText}>{offline ? 'Device offline, no live data' : `Monitoring ongoing · NEWS2 ${V?.news2Score ?? '—'}`}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {offline ? 'offline' : (V?.news2Level === 'CRITICAL' || V?.news2Level === 'HIGH' ? 'attention' : 'stable')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>

          {/* Vitals 2x2 grid */}
          <View style={styles.grid2}>
            <VitalCard icon="lungs" label="Respiratory Rate"
              value={V?.respRate ? Math.round(V.respRate) : '—'}
              unit="breath/min" color={PURPLE} />
            <VitalCard icon="heart" label="Heart Rate"
              value={V?.heartRate ? Math.round(V.heartRate) : '—'}
              unit="bpm"
              color={V?.heartRate > 100 || V?.heartRate < 51 ? '#EF4444' : '#111'} />
            <VitalCard icon="droplet" label="SpO2"
              value={V?.spo2 ? `${V.spo2.toFixed(0)}%` : '—'}
              color={V?.spo2 < 93 ? '#EF4444' : PURPLE} />
          </View>

          {/* BP and Temp */}
          <View style={styles.grid2}>
            <View style={styles.vitalCard}>
              <View style={styles.vitalHeader}>
                <Icon name="stethoscope" size={22} color={PURPLE} />
                <Text style={styles.vitalLabel}>Blood Pressure</Text>
              </View>
              <Text style={styles.vitalValue}>
                {V?.systolic && V?.diastolic
                  ? `${Math.round(V.systolic)}/${Math.round(V.diastolic)}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.vitalCard}>
              <View style={styles.vitalHeader}>
                <Icon name="thermometer" size={22} color={PURPLE} />
                <Text style={styles.vitalLabel}>Temp.</Text>
              </View>
              <Text style={[styles.vitalValue, { color: V?.temperature > 38 ? '#EF4444' : '#111' }]}>
                {V?.temperature ? `${V.temperature.toFixed(1)}C` : '—'}
              </Text>
            </View>
          </View>

          {/* NEWS2 Score */}
          <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View>
              <Text style={styles.cardSub}>NEWS2 Early Warning Score</Text>
              <Text style={[styles.news2Value, { color: nc }]}>{V?.news2Score ?? '—'}</Text>
            </View>
            <View style={[styles.news2Badge, { backgroundColor: nc + '20' }]}>
              <Text style={[styles.news2Level, { color: nc }]}>{V?.news2Level || '—'}</Text>
              <Text style={styles.news2Sub}>Risk Level</Text>
            </View>
          </View>

          {/* AI Assistant Doctor */}
          <View style={styles.card}>
            <View style={styles.aiHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="bot" size={16} color={PURPLE} /><Text style={styles.cardTitle}>AI Assistant Doctor</Text></View>
                <Text style={styles.cardSub}>Decision support for nursing staff. Not a diagnosis.</Text>
              </View>
              <TouchableOpacity style={styles.askBtn} onPress={() => setShowAI(s => !s)}>
                <Text style={styles.askBtnText}>{showAI ? 'Hide' : 'Ask'}</Text>
              </TouchableOpacity>
            </View>

            {showAI && (
              <View style={{ marginTop: 12 }}>
                {aiResponse !== '' && (
                  <View style={styles.aiResponse}>
                    <Markdown text={aiResponse} color="#4B0082" />
                  </View>
                )}
                <View style={styles.aiInputRow}>
                  <TextInput
                    style={styles.aiInput}
                    placeholder="Ask about this patient..."
                    placeholderTextColor="#9CA3AF"
                    value={aiQuery}
                    onChangeText={setAiQuery}
                    onSubmitEditing={askAI}
                    returnKeyType="send"
                  />
                  <TouchableOpacity style={styles.sendBtn} onPress={askAI} disabled={aiLoading}>
                    {aiLoading
                      ? <ActivityIndicator color="white" size="small" />
                      : <Text style={styles.sendBtnText}>Send</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5FF' },
  header: { backgroundColor: PURPLE_DARK, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  patientHeaderRow: { flexDirection: 'row', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  patientName: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 2 },
  patientMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4 },
  patientRoom: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 8 },
  headerBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monitorText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, flex: 1 },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  statusText: { color: 'white', fontSize: 11, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  vitalCard: { flex: 1, minWidth: '45%', backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  vitalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  vitalLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', flex: 1 },
  vitalValue: { fontSize: 28, fontWeight: '800', color: '#111', lineHeight: 32 },
  vitalUnit: { fontSize: 12, color: PURPLE, marginTop: 4 },
  vitalSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 12, color: '#9CA3AF' },
  news2Value: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  news2Badge: { borderRadius: 14, padding: 12, alignItems: 'center', minWidth: 90 },
  news2Level: { fontSize: 14, fontWeight: '700' },
  news2Sub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  askBtn: { backgroundColor: PURPLE, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  askBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  aiResponse: { backgroundColor: '#F3E8FF', borderRadius: 12, padding: 14, marginBottom: 12 },
  aiResponseText: { fontSize: 13, color: '#4B0082', lineHeight: 20 },
  aiInputRow: { flexDirection: 'row', gap: 8 },
  aiInput: { flex: 1, borderWidth: 1.5, borderColor: '#E9D5FF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#111' },
  sendBtn: { backgroundColor: PURPLE, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  sendBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
});
