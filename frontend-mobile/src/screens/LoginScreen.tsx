import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PURPLE, PURPLE_DARK } from '../theme';
import { apiFetch } from '../hooks/useApi';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill in all fields'); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.success) {
        await AsyncStorage.setItem('doctor', JSON.stringify(res.data));
        navigation.replace('Main');
      } else {
        Alert.alert('Login Failed', res.error || 'Invalid credentials');
      }
    } catch {
      Alert.alert('Error', 'Connection error. Check your internet and try again.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>⚕️</Text>
        </View>

        <Text style={styles.welcome}>welcome back</Text>
        <Text style={styles.title}>Doctor's Login</Text>
        <Text style={styles.subtitle}>Sign in to continue monitor{'\n'}your patients</Text>

        {/* Card */}
        <View style={styles.card}>
          {/* Email */}
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Remember me */}
          <View style={styles.rememberRow}>
            <TouchableOpacity onPress={() => setRemember(r => !r)} style={styles.checkRow}>
              <View style={[styles.checkbox, remember && styles.checkboxActive]}>
                {remember && <Text style={{ color: 'white', fontSize: 10 }}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <Text style={[styles.rememberText, { color: PURPLE }]}>Forgotten password</Text>
          </View>

          {/* Login button */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.loginBtnText}>Login</Text>}
          </TouchableOpacity>

          <Text style={styles.orText}>or</Text>

          {/* Google */}
          <TouchableOpacity style={styles.googleBtn}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PURPLE_DARK },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoBox: { width: 90, height: 90, backgroundColor: 'white', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoText: { fontSize: 44 },
  welcome: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4 },
  title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginBottom: 32 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14, gap: 10 },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, fontSize: 15, color: '#111' },
  rememberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  rememberText: { fontSize: 13, color: '#6B7280' },
  loginBtn: { backgroundColor: PURPLE, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
  loginBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  orText: { textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginBottom: 14 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 13, gap: 10 },
  googleG: { fontSize: 20, fontWeight: '700', color: '#4285F4' },
  googleText: { fontSize: 15, color: '#111' },
});
