'use client';
import Icon from '@/components/Icon';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PURPLE, PURPLE_DARK, STATUS, news2Color, isStale } from '@/lib/theme';
import { patientApi, alertApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNow } from '@/hooks/useNow';
import BottomNav from '@/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [alerts,   setAlerts]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { connected, vitalsMap, alerts: wsAlerts } = useWebSocket();

  useEffect(() => {
    Promise.all([patientApi.list(), alertApi.list()])
      .then(([p, a]) => { if (p.success) setPatients(p.data); if (a.success) setAlerts(a.data); })
      .finally(() => setLoading(false));
  }, []);

  const now = useNow(5000);

  // Merge live alerts into the fetched list instead of replacing it
  useEffect(() => {
    if (!wsAlerts.length) return;
    setAlerts(prev => {
      const known = new Set(prev.map(a => String(a._id || a.alertId)));
      const fresh = wsAlerts.filter(a => !known.has(String(a._id || a.alertId)));
      return fresh.length ? [...fresh, ...prev] : prev;
    });
  }, [wsAlerts]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning,' : hour < 17 ? 'Good Afternoon,' : 'Good Evening,';

  const latestOf = (p: any) => vitalsMap[p.patientId] || p.latestVitals;
  // A patient whose device stopped sending is "offline", not "stable"
  const getLevel = (p: any) => { const v = latestOf(p); return !v || isStale(v, now) ? 'OFFLINE' : (v.news2Level || 'LOW'); };
  const needAttention = patients.filter(p => ['HIGH','CRITICAL'].includes(getLevel(p)));
  const offlineCount = patients.filter(p => getLevel(p) === 'OFFLINE').length;
  const normal = patients.length - needAttention.length - offlineCount;
  const ago = (v: any) => {
    if (!v?.timestamp) return 'no data';
    const m = Math.floor((now - new Date(v.timestamp).getTime()) / 60000);
    return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m/60)} h ago` : `${Math.floor(m/1440)} d ago`;
  };

  const card: any = { background:'white', borderRadius:20, padding:18, marginBottom:14, boxShadow:'0 4px 20px rgba(107,33,168,0.08)' };

  const acknowledgeAlert = async (alertId: string) => {
    const r = await alertApi.acknowledge(alertId);
    if (r.success) setAlerts(a => a.filter(x => String(x.alertId || x._id) !== String(alertId)));
  };

  return (
    <ProtectedRoute>
      <div className="mw-shell">

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, padding:'52px 20px 30px', borderRadius:'0 0 30px 30px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div>
              <p style={{ color:'rgba(255,255,255,0.8)', fontSize:14, marginBottom:2 }}>{greeting}</p>
              <h2 style={{ color:'white', fontSize:22, fontWeight:800 }}>{user?.role === 'nurse' ? '' : 'Dr. '}{user?.name || 'Staff'}</h2>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {/* Live dot */}
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:connected?'#4ADE80':'#9CA3AF', boxShadow:connected?'0 0 8px #4ADE80':'none' }}/>
                <span style={{ color:'rgba(255,255,255,0.7)', fontSize:11 }}>{connected?'Live':'Disconnected'}</span>
              </div>
              {/* Bell */}
              <div role="button" tabIndex={0} aria-label={`Alerts (${alerts.length})`} onKeyDown={e => e.key==='Enter' && router.push('/patients')} style={{ position:'relative', cursor:'pointer' }} onClick={() => router.push('/patients')}>
                <span style={{ fontSize:24 }}><Icon name="bell" /></span>
                {alerts.length > 0 && (
                  <div style={{ position:'absolute', top:-4, right:-4, background:'#EF4444', borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'white', fontWeight:800 }}>
                    {alerts.length > 9 ? '9+' : alerts.length}
                  </div>
                )}
              </div>
              {/* Avatar */}
              <div style={{ width:42, height:42, borderRadius:'50%', background:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:'2px solid white' }}><Icon name="stethoscope" /></div>
            </div>
          </div>
        </div>

        <div className="mw-pad">

          {/* Active alerts banner */}
          {alerts.length > 0 && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:14, padding:'12px 16px', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontWeight:700, color:'#DC2626', fontSize:14 }}><Icon name="alert" /> Active Alerts ({alerts.length})</span>
              </div>
              {alerts.slice(0,3).map((a, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderTop:'1px solid #FECACA' }}>
                  <span style={{ fontSize:13, color:'#7F1D1D' }}>{a.message || `Patient ${a.patientId} — ${a.level}`}</span>
                  <button onClick={() => acknowledgeAlert(a.alertId || a._id)}
                    style={{ background:'none', border:'1px solid #DC2626', color:'#DC2626', borderRadius:8, padding:'3px 8px', fontSize:11, cursor:'pointer' }}>Ack</button>
                </div>
              ))}
            </div>
          )}

          {/* Overview */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ fontWeight:700, fontSize:16, color:'#111' }}>Overview</span>
              <span style={{ fontSize:13, color:'#9CA3AF' }}>{new Date(now).toLocaleDateString()}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(90px, 1fr))', gap:10 }}>
              {[
                { icon:'users', label:'Total patients', value:patients.length, color:PURPLE },
                { icon:'alert', label:'Need Attention',  value:needAttention.length, color:'#F59E0B' },
                { icon:'check', label:'Normal',           value:normal, color:'#16A34A' },
                { icon:'activity', label:'Device offline', value:offlineCount, color:'#6B7280' },
              ].map(({ icon, label, value, color }) => (
                <div key={label} style={{ textAlign:'center', background:'#FAFAFA', borderRadius:14, padding:'12px 8px' }}>
                  <div style={{ fontSize:24, marginBottom:4 }}><Icon name={icon} /></div>
                  <div style={{ fontSize:10, color:'#9CA3AF', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:26, fontWeight:800, color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Needs attention */}
          {needAttention.length > 0 && (
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ fontWeight:700, fontSize:15, color:'#111' }}>Patients needing attention</span>
                <span onClick={() => router.push('/patients')} style={{ fontSize:13, color:PURPLE, cursor:'pointer' }}>View all</span>
              </div>
              {needAttention.slice(0,3).map(p => {
                const v = latestOf(p);
                return (
                  <div key={p._id} onClick={() => router.push(`/patients/${p.patientId}`)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:'1px solid #F3F4F6', cursor:'pointer' }}>
                    <div style={{ width:44, height:44, borderRadius:'50%', background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}><Icon name="heart" /></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:15, color:'#111' }}>{p.name}</div>
                      <div style={{ fontSize:12, color:'#9CA3AF' }}>{p.condition || 'General'}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:15, fontWeight:700, color:news2Color(v?.news2Score||0) }}>
                        NEWS2: {v?.news2Score ?? '—'}
                      </div>
                      <span style={{ fontSize:18, color:'#9CA3AF' }}>›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent updates */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontWeight:700, fontSize:15, color:'#111' }}>Recent patients updates</span>
              <span onClick={() => router.push('/patients')} style={{ fontSize:13, color:PURPLE, cursor:'pointer' }}>View all</span>
            </div>
            {loading ? <div style={{ textAlign:'center', padding:20, color:'#9CA3AF' }}>Loading...</div> :
             patients.length === 0
              ? <div style={{ textAlign:'center', padding:20, color:'#9CA3AF', fontSize:14 }}>No patients yet. <span onClick={() => router.push('/patients/add')} style={{ color:PURPLE, cursor:'pointer' }}>Add one →</span></div>
              : patients.slice(0,4).map(p => {
                  const level = getLevel(p);
                  const sk = level === 'OFFLINE' ? 'offline' : ['HIGH','CRITICAL'].includes(level) ? 'attention' : 'stable';
                  const st = STATUS[sk];
                  return (
                    <div key={p._id} onClick={() => router.push(`/patients/${p.patientId}`)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:'1px solid #F3F4F6', cursor:'pointer' }}>
                      <div style={{ width:44, height:44, borderRadius:'50%', background:PURPLE+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}><Icon name="user" /></div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:15, color:'#111' }}>{p.name}</div>
                        <div style={{ fontSize:12, color:'#9CA3AF' }}>{p.condition || 'General'}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <span style={{ background:st.bg, color:st.color, fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20 }}>{st.label}</span>
                        <div style={{ fontSize:11, color:'#9CA3AF', marginTop:3 }}>{ago(latestOf(p))}</div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
