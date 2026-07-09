'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PURPLE, PURPLE_DARK, STATUS, news2Color } from '@/lib/theme';
import { apiFetch } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import BottomNav from '@/components/BottomNav';

export default function HomePage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { connected, vitalsMap, alerts } = useWebSocket();

  useEffect(() => {
    const d = localStorage.getItem('doctor');
    if (!d) { router.push('/login'); return; }
    setDoctor(JSON.parse(d));
    apiFetch('/api/patients').then(r => { if (r.success) setPatients(r.data); setLoading(false); });
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning,' : hour < 17 ? 'Good Afternoon,' : 'Good Evening,';
  const needAttention = patients.filter(p => { const v = vitalsMap[p.patientId] || p.latestVitals; return v?.news2Level === 'HIGH' || v?.news2Level === 'CRITICAL'; });
  const normal = patients.length - needAttention.length;
  const getStatus = (p: any) => { const v = vitalsMap[p.patientId] || p.latestVitals; return (v?.news2Level === 'HIGH' || v?.news2Level === 'CRITICAL') ? 'attention' : 'stable'; };

  const card: any = { background: 'white', borderRadius: 20, padding: 18, marginBottom: 14, boxShadow: '0 4px 20px rgba(107,33,168,0.08)' };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F5FF', maxWidth: 430, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, padding: '52px 20px 30px', borderRadius: '0 0 30px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 2 }}>{greeting}</p>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>{doctor?.name || 'Dr. Obed'}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#4ADE80' : '#9CA3AF', boxShadow: connected ? '0 0 8px #4ADE80' : 'none' }} />
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => router.push('/patients')}>
              <span style={{ fontSize: 24 }}>🔔</span>
              {alerts.length > 0 && <div style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 800 }}>{alerts.length}</div>}
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '2px solid white' }}>👨‍⚕️</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', paddingBottom: 100 }}>

        {/* Overview */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Overview</span>
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>Today ▾</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { icon: '👥', label: 'Total patients', value: patients.length, color: PURPLE },
              { icon: '⚠️', label: 'Need Attention', value: needAttention.length, color: '#F59E0B' },
              { icon: '✅', label: 'Normal', value: normal, color: '#16A34A' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', background: '#FAFAFA', borderRadius: 14, padding: '12px 8px' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs attention */}
        {needAttention.length > 0 && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Patients needing attention</span>
              <span onClick={() => router.push('/patients')} style={{ fontSize: 13, color: PURPLE, cursor: 'pointer' }}>View all</span>
            </div>
            {needAttention.slice(0, 3).map(p => {
              const v = vitalsMap[p.patientId] || p.latestVitals;
              return (
                <div key={p._id} onClick={() => router.push(`/patients/${p.patientId}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>❤️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>High heart rate</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: news2Color(v?.news2Score || 0) }}>
                    {v?.heartRate ? `${Math.round(v.heartRate)}bpm` : v?.spo2 ? `${v.spo2.toFixed(0)}%` : '—'}
                  </div>
                  <span style={{ fontSize: 18, color: '#9CA3AF' }}>›</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent updates */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Recent patients updates</span>
            <span onClick={() => router.push('/patients')} style={{ fontSize: 13, color: PURPLE, cursor: 'pointer' }}>View all</span>
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>Loading...</div> :
            patients.length === 0 ? <div style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>No patients yet</div> :
            patients.slice(0, 4).map(p => {
              const sk = getStatus(p); const st = STATUS[sk];
              return (
                <div key={p._id} onClick={() => router.push(`/patients/${p.patientId}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: PURPLE + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>Vitals {sk}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>{st.label}</span>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>just now</div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
