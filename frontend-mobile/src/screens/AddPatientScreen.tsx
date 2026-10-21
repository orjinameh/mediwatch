import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { PURPLE, PURPLE_DARK } from '../theme';
import { apiFetch } from '../hooks/useApi';
import Icon from '../components/Icon';

const GENDERS = ['Male', 'Female', 'Other'];

export default function AddPatientScreen({ navigation }: any) {
  const [form, setForm] = useState({ name: '', age: '', gender: '', condition: '', ward: '', roomNumber: '', bloodGroup: '', phone: '', emergencyContact: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (saving) return;
    if (!form.name.trim()) { Alert.alert('Missing name', 'Patient name is required'); return; }
    const age = form.age ? Number(form.age) : undefined;
    if (age !== undefined && (!Number.isFinite(age) || age < 0 || age > 130)) { Alert.alert('Invalid age', 'Enter a valid age'); return; }
    setSaving(true);
    const body: Record<string, any> = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach(k => { if (form[k].trim()) body[k] = form[k].trim(); });
    if (age !== undefined) body.age = age;
    const res = await apiFetch('/api/patients', { method: 'POST', body: JSON.stringify(body) });
    setSaving(false);
    if (res.success) navigation.replace('PatientDetail', { patientId: res.data.patientId });
    else Alert.alert('Could not add patient', res.error || 'Please try again');
  };

  const field = (k: keyof typeof form, label: string, extra: any = {}) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={form[k]} onChangeText={set(k)} placeholderTextColor="#9CA3AF" {...extra} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
              <Icon name="arrowLeft" size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Add Patient</Text>
          </View>

          <View style={styles.card}>
            {field('name', 'Full name *', { autoCapitalize: 'words' })}
            {field('age', 'Age', { keyboardType: 'number-pad' })}
            <Text style={styles.label}>Gender</Text>
            <View style={styles.chips}>
              {GENDERS.map(g => (
                <TouchableOpacity key={g} onPress={() => set('gender')(form.gender === g ? '' : g)}
                  style={[styles.chip, form.gender === g && styles.chipActive]}>
                  <Text style={[styles.chipText, form.gender === g && { color: 'white' }]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {field('condition', 'Condition')}
            {field('ward', 'Ward')}
            {field('roomNumber', 'Room number')}
            {field('bloodGroup', 'Blood group', { autoCapitalize: 'characters' })}
            {field('phone', 'Phone', { keyboardType: 'phone-pad' })}
            {field('emergencyContact', 'Emergency contact')}
            <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Add Patient</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5FF' },
  header: { backgroundColor: PURPLE_DARK, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 20, margin: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111' },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  chipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  chipText: { fontSize: 13, color: '#6B7280' },
  saveBtn: { backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  saveText: { color: 'white', fontSize: 15, fontWeight: '600' },
});
