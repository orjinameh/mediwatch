'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PURPLE, PURPLE_DARK, STATUS } from '@/lib/theme';
import { apiFetch } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import BottomNav from '@/components/BottomNav';

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { vitalsMap, alerts } = useWebSocket();

  useEffect(() => { apiFetch('/api/patients').then(r => { if (r.success) setPatients(r.data); setLoading(false); }); }, []);

  const getStatus = (p: any) => { const v = vitalsMap[p.patientId] || p.latestVitals; return (v?.news2Level === 'HIGH' || v?.news2Level === 'CRITICAL') ? 'attention' : 'stable'; };
  const filtered = patients.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.patientId?.toLowerCase().includes(search.toLowerCase()) || p.ward?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: '#F8F5FF', maxWidth: 430, margin: '0 auto' }}>

      <div style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, padding: '52px 20px 24px', borderRadius: '0 0 30px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ color: 'white', fontSize: 24, fontWeight: 800 }}>Patients</h2>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: 24 }}>🔔</span>
            {alerts.length > 0 && <div style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 800 }}>{alerts.length}</div>}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients by name, ID or room"
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14, color: '#111', background: 'transparent' }} />
        </div>
      </div>

      <div style={{ padding: '20px 16px', paddingBottom: 100 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Loading patients...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 80, marginBottom: 16 }}>📋</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: PURPLE, marginBottom: 8 }}>No Patients yet</h3>
            <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 28 }}>Add your first patient and start<br />monitoring their vitals</p>
            <button style={{ background: PURPLE, color: 'white', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto' }}>+ Add Patients</button>
          </div>
        ) : (
          <>
            {filtered.map(p => {
              const v = vitalsMap[p.patientId] || p.latestVitals;
              const sk = getStatus(p); const st = STATUS[sk];
              return (
                <div key={p._id} onClick={() => router.push(`/patients/${p.patientId}`)}
                  style={{ background: 'white', borderRadius: 16, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxShadow: '0 2px 12px rgba(107,33,168,0.06)' }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: PURPLE + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>👤</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 3 }}>{p.age || '—'} Years · Room {p.patientId?.slice(-3)}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      HR {v?.heartRate ? Math.round(v.heartRate) : '—'} &nbsp;
                      SpO2 {v?.spo2 ? v.spo2.toFixed(0) : '—'}% &nbsp;
                      Temp {v?.temperature ? v.temperature.toFixed(1) : '—'} C
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>{st.label}</span>
                    <span style={{ fontSize: 18, color: '#9CA3AF' }}>›</span>
                  </div>
                </div>
              );
            })}
            <button style={{ width: '100%', background: PURPLE, color: 'white', border: 'none', borderRadius: 14, padding: '15px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>+ Add Patients</button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
