'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PURPLE, PURPLE_DARK, STATUS } from '@/lib/theme';
import { patientApi } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import BottomNav from '@/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all'); // all | attention | stable
  const [loading,  setLoading]  = useState(true);
  const { vitalsMap, alerts } = useWebSocket();

  useEffect(() => {
    patientApi.list().then(r => { if (r.success) setPatients(r.data); setLoading(false); });
  }, []);

  const getStatus = (p: any) => {
    const v = vitalsMap[p.patientId] || p.latestVitals;
    return ['HIGH','CRITICAL'].includes(v?.news2Level) ? 'attention' : 'stable';
  };

  const filtered = patients.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.patientId?.toLowerCase().includes(search.toLowerCase()) ||
      p.ward?.toLowerCase().includes(search.toLowerCase()) ||
      p.condition?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || getStatus(p) === filter;
    return matchSearch && matchFilter;
  });

  return (
    <ProtectedRoute>
      <div style={{ minHeight:'100vh', background:'#F8F5FF', maxWidth:430, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, padding:'52px 20px 24px', borderRadius:'0 0 30px 30px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h2 style={{ color:'white', fontSize:24, fontWeight:800 }}>Patients</h2>
            <div style={{ position:'relative' }}>
              <span style={{ fontSize:24, cursor:'pointer' }}>🔔</span>
              {alerts.length > 0 && <div style={{ position:'absolute', top:-4, right:-4, background:'#EF4444', borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'white', fontWeight:800 }}>{alerts.length}</div>}
            </div>
          </div>
          {/* Search */}
          <div style={{ background:'white', borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, ward or condition"
              style={{ border:'none', outline:'none', flex:1, fontSize:14, color:'#111', background:'transparent' }} />
            {search && <span onClick={() => setSearch('')} style={{ cursor:'pointer', color:'#9CA3AF', fontSize:18 }}>×</span>}
          </div>
        </div>

        <div style={{ padding:'16px', paddingBottom:100 }}>

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {[['all','All'],['attention','⚠️ Attention'],['stable','✅ Stable']].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilter(val)}
                style={{ flex:1, background:filter===val ? PURPLE : 'white', color:filter===val ? 'white' : '#6B7280', border:`1px solid ${filter===val ? PURPLE : '#E5E7EB'}`, borderRadius:10, padding:'8px 4px', fontSize:12, fontWeight:filter===val ? 700 : 400, cursor:'pointer' }}>
                {lbl}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>Loading patients...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:80, marginBottom:16 }}>📋</div>
              <h3 style={{ fontSize:20, fontWeight:700, color:PURPLE, marginBottom:8 }}>
                {search ? 'No results found' : 'No Patients yet'}
              </h3>
              <p style={{ fontSize:14, color:'#9CA3AF', marginBottom:28 }}>
                {search ? `No patients match "${search}"` : 'Add your first patient and start monitoring their vitals'}
              </p>
              {!search && (
                <button onClick={() => router.push('/patients/add')}
                  style={{ background:PURPLE, color:'white', border:'none', borderRadius:14, padding:'14px 28px', fontSize:15, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:8, margin:'0 auto' }}>
                  + Add Patient
                </button>
              )}
            </div>
          ) : (
            <>
              <p style={{ fontSize:12, color:'#9CA3AF', marginBottom:12 }}>{filtered.length} patient{filtered.length!==1?'s':''}</p>
              {filtered.map(p => {
                const v = vitalsMap[p.patientId] || p.latestVitals;
                const sk = getStatus(p);
                const st = STATUS[sk];
                return (
                  <div key={p._id} onClick={() => router.push(`/patients/${p.patientId}`)}
                    style={{ background:'white', borderRadius:16, padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:14, cursor:'pointer', boxShadow:'0 2px 12px rgba(107,33,168,0.06)', borderLeft:`3px solid ${sk==='attention'?'#F59E0B':'#16A34A'}` }}>
                    <div style={{ width:50, height:50, borderRadius:'50%', background:PURPLE+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>👤</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:15, color:'#111', marginBottom:2 }}>{p.name}</div>
                      <div style={{ fontSize:12, color:'#9CA3AF', marginBottom:3 }}>{p.age||'—'} yrs · {p.ward||'Ward'} · {p.condition||'General'}</div>
                      <div style={{ fontSize:11, color:'#9CA3AF' }}>
                        HR {v?.heartRate ? Math.round(v.heartRate) : '—'} &nbsp;
                        SpO2 {v?.spo2 ? v.spo2.toFixed(0) : '—'}% &nbsp;
                        Temp {v?.temperature ? v.temperature.toFixed(1) : '—'}°C
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                      <span style={{ background:st.bg, color:st.color, fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20 }}>{st.label}</span>
                      <span style={{ fontSize:18, color:'#9CA3AF' }}>›</span>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => router.push('/patients/add')}
                style={{ width:'100%', background:PURPLE, color:'white', border:'none', borderRadius:14, padding:'15px', fontSize:15, fontWeight:600, cursor:'pointer', marginTop:8, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                + Add Patient
              </button>
            </>
          )}
        </div>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
