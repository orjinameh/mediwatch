'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PURPLE, PURPLE_DARK, news2Color } from '@/lib/theme';
import { patientApi, vitalsApi, aiApi, alertApi } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import ECGWaveform from '@/components/ECGWaveform';
import BottomNav from '@/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';

const VCard = ({ icon, label, value, unit, sub, color }: any) => (
  <div style={{ background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(107,33,168,0.06)', flex:'1 1 45%' }}>
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
      <span style={{ fontSize:22 }}>{icon}</span>
      <span style={{ fontSize:11, color:'#9CA3AF' }}>{label}</span>
    </div>
    <div style={{ fontSize:28, fontWeight:800, color:color||'#111', lineHeight:1 }}>{value}</div>
    {unit && <div style={{ fontSize:12, color:color||PURPLE, marginTop:4 }}>{unit}</div>}
    {sub  && <div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>{sub}</div>}
  </div>
);

export default function PatientDetailPage() {
  const router = useRouter();
  const { id }  = useParams<{ id: string }>();
  const [patient,   setPatient]   = useState<any>(null);
  const [vitals,    setVitals]    = useState<any>(null);
  const [aiQuery,   setAiQuery]   = useState('');
  const [aiResp,    setAiResp]    = useState('');
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [aiLoad,    setAiLoad]    = useState(false);
  const [showAI,    setShowAI]    = useState(false);
  const [tab,       setTab]       = useState<'vitals'|'ai'|'alerts'>('vitals');
  const [patAlerts, setPatAlerts] = useState<any[]>([]);
  const [deleting,  setDeleting]  = useState(false);
  const { vitalsMap, subscribe } = useWebSocket();

  useEffect(() => {
    if (!id) return;
    subscribe(id);
    Promise.all([
      patientApi.get(id),
      vitalsApi.latest(id),
      alertApi.forPatient(id),
      aiApi.history(id),
    ]).then(([p, v, a, ai]) => {
      if (p.success) setPatient(p.data);
      if (v.success) setVitals(v.data);
      if (a.success) setPatAlerts(a.data);
      if (ai.success) setAiHistory(ai.data);
    });
  }, [id]);

  useEffect(() => { if (id && vitalsMap[id]) setVitals(vitalsMap[id]); }, [vitalsMap, id]);

  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoad(true);
    const res = await aiApi.ask(id, aiQuery, 'nurse');
    if (res.success) {
      setAiResp(res.data.response);
      setAiHistory(h => [{ query: aiQuery, response: res.data.response, timestamp: new Date() }, ...h.slice(0,9)]);
      setAiQuery('');
    }
    setAiLoad(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${patient?.name} from monitoring?`)) return;
    setDeleting(true);
    await patientApi.delete(id);
    router.push('/patients');
  };

  const acknowledgeAlert = async (alertId: string) => {
    await alertApi.acknowledge(alertId);
    setPatAlerts(a => a.map(x => x._id === alertId ? { ...x, acknowledged: true } : x));
  };

  const V = vitals;
  const nc = news2Color(V?.news2Score || 0);
  const statusLabel = ['CRITICAL','HIGH'].includes(V?.news2Level) ? 'attention' : 'stable';

  if (!patient) return (
    <ProtectedRoute>
      <div style={{ minHeight:'100vh', background:PURPLE_DARK, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'white' }}>Loading patient...</div>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      <div style={{ minHeight:'100vh', background:'#F8F5FF', maxWidth:430, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, padding:'52px 20px 28px', borderRadius:'0 0 30px 30px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <button onClick={() => router.back()} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:10, width:36, height:36, color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
            <button onClick={handleDelete} disabled={deleting} style={{ background:'rgba(239,68,68,0.3)', border:'1px solid rgba(239,68,68,0.5)', borderRadius:10, padding:'6px 12px', color:'white', fontSize:12, cursor:'pointer' }}>
              {deleting ? '...' : '🗑️ Remove'}
            </button>
          </div>
          <div style={{ display:'flex', gap:14 }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, border:'2px solid rgba(255,255,255,0.5)', flexShrink:0 }}>👤</div>
            <div style={{ flex:1 }}>
              <h2 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:2 }}>{patient.name}</h2>
              <p style={{ color:'rgba(255,255,255,0.8)', fontSize:13, marginBottom:4 }}>
                {patient.age||'—'} yrs • {patient.gender||'—'} • {patient.bloodGroup||'—'}
              </p>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:12, marginBottom:8 }}>
                {patient.ward||'Ward'} · Room {patient.roomNumber||patient.patientId?.slice(-3)} · ID: {patient.patientId}
              </p>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ color:'rgba(255,255,255,0.8)', fontSize:11 }}>• {patient.condition || 'Monitoring ongoing'}</span>
                <span style={{ background:'rgba(255,255,255,0.25)', color:'white', fontSize:11, fontWeight:600, padding:'4px 12px', borderRadius:20, border:'1px solid rgba(255,255,255,0.4)' }}>{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', padding:'0 16px', marginTop:16, gap:8, marginBottom:4 }}>
          {([['vitals','📊 Vitals'],['ai','🤖 AI Doctor'],['alerts','🔔 Alerts']] as const).map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1, background:tab===t ? PURPLE : 'white', color:tab===t ? 'white' : '#6B7280', border:`1px solid ${tab===t ? PURPLE : '#E5E7EB'}`, borderRadius:10, padding:'9px 4px', fontSize:12, fontWeight:tab===t?700:400, cursor:'pointer' }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ padding:'12px 16px', paddingBottom:100 }}>

          {/* VITALS TAB */}
          {tab === 'vitals' && <>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:14 }}>
              <VCard icon="🫁" label="Respiratory Rate" value={V?.respRate ? Math.round(V.respRate) : '—'} unit="breath/min" color={V?.respRate > 25 ? '#EF4444' : PURPLE} />
              <VCard icon="❤️" label="Heart Rate"       value={V?.heartRate ? Math.round(V.heartRate) : '—'} unit="bpm" color={V?.heartRate > 100 ? '#EF4444' : '#EF4444'} />
              <VCard icon="💧" label="SpO2"             value={V?.spo2 ? `${V.spo2.toFixed(0)}%` : '—'} color={V?.spo2 < 93 ? '#EF4444' : PURPLE} />
              <VCard icon="〰️" label="ECG"             value="Normal" sub="Sinus Rhythm" color="#111" />
            </div>

            <div style={{ background:'white', borderRadius:16, padding:16, marginBottom:14, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:14, fontWeight:700, color:'#111' }}>ECG Waveform</span>
                <span style={{ fontSize:12, color:'#9CA3AF' }}>10mm/mv</span>
              </div>
              <div style={{ background:'#FDF2F8', borderRadius:12, padding:10 }}><ECGWaveform /></div>
            </div>

            <div style={{ display:'flex', gap:12, marginBottom:14 }}>
              <div style={{ flex:1, background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}><span style={{ fontSize:22 }}>🩺</span><span style={{ fontSize:11, color:'#9CA3AF' }}>Blood Pressure</span></div>
                <div style={{ fontSize:22, fontWeight:800, color:'#111' }}>{V?.systolic && V?.diastolic ? `${Math.round(V.systolic)}/${Math.round(V.diastolic)}` : '—'}</div>
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>mmHg</div>
              </div>
              <div style={{ flex:1, background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}><span style={{ fontSize:22 }}>🌡️</span><span style={{ fontSize:11, color:'#9CA3AF' }}>Temperature</span></div>
                <div style={{ fontSize:22, fontWeight:800, color:V?.temperature > 38 ? '#EF4444' : '#111' }}>{V?.temperature ? `${V.temperature.toFixed(1)}°C` : '—'}</div>
              </div>
            </div>

            <div style={{ background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(107,33,168,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, color:'#9CA3AF', marginBottom:4 }}>NEWS2 Early Warning Score</div>
                <div style={{ fontSize:36, fontWeight:800, color:nc }}>{V?.news2Score ?? '—'}</div>
                <div style={{ fontSize:11, color:'#9CA3AF' }}>Last updated: {V?.timestamp ? new Date(V.timestamp).toLocaleTimeString() : '—'}</div>
              </div>
              <div style={{ background:nc+'20', borderRadius:14, padding:'12px 20px', textAlign:'center' }}>
                <div style={{ fontSize:14, fontWeight:700, color:nc }}>{V?.news2Level || 'LOW'}</div>
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>Risk Level</div>
              </div>
            </div>
          </>}

          {/* AI DOCTOR TAB */}
          {tab === 'ai' && <>
            <div style={{ background:'white', borderRadius:16, padding:16, marginBottom:14, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#111', marginBottom:4 }}>🤖 AI Assistant Doctor</div>
              <div style={{ fontSize:12, color:'#9CA3AF', marginBottom:16 }}>Ask about {patient.name}'s condition. Context: current vitals + NEWS2 score {V?.news2Score ?? '—'}.</div>

              {/* Quick prompts */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {['What is the current risk?','Suggest immediate actions','What vitals are abnormal?','Draft escalation note'].map(q => (
                  <button key={q} onClick={() => { setAiQuery(q); setTimeout(askAI, 100); }}
                    style={{ background:'#F3E8FF', color:PURPLE, border:'none', borderRadius:20, padding:'6px 12px', fontSize:12, cursor:'pointer' }}>
                    {q}
                  </button>
                ))}
              </div>

              {aiResp && (
                <div style={{ background:'#F3E8FF', borderRadius:12, padding:14, marginBottom:14, fontSize:13, color:'#4B0082', lineHeight:1.7, borderLeft:`3px solid ${PURPLE}` }}>
                  {aiResp}
                </div>
              )}

              <div style={{ display:'flex', gap:8 }}>
                <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && askAI()}
                  placeholder="Ask about this patient..."
                  style={{ flex:1, border:'1.5px solid #E9D5FF', borderRadius:12, padding:'10px 14px', fontSize:13, outline:'none', color:'#111' }} />
                <button onClick={askAI} disabled={aiLoad}
                  style={{ background:PURPLE, color:'white', border:'none', borderRadius:12, padding:'10px 18px', fontSize:13, fontWeight:600, cursor:aiLoad?'not-allowed':'pointer', opacity:aiLoad?0.7:1 }}>
                  {aiLoad ? '...' : 'Send'}
                </button>
              </div>
            </div>

            {/* AI History */}
            {aiHistory.length > 0 && (
              <div style={{ background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#111', marginBottom:12 }}>Previous consultations</div>
                {aiHistory.map((h, i) => (
                  <div key={i} style={{ borderBottom:'1px solid #F3F4F6', paddingBottom:12, marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:PURPLE, marginBottom:4 }}>Q: {h.query}</div>
                    <div style={{ fontSize:12, color:'#6B7280', lineHeight:1.6 }}>{h.response?.slice(0, 120)}...</div>
                    <div style={{ fontSize:10, color:'#9CA3AF', marginTop:4 }}>{new Date(h.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </>}

          {/* ALERTS TAB */}
          {tab === 'alerts' && <>
            {patAlerts.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 20px', color:'#9CA3AF' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                  <div style={{ fontSize:15, fontWeight:600 }}>No alerts for this patient</div>
                </div>
              : patAlerts.map(a => (
                <div key={a._id} style={{ background:'white', borderRadius:16, padding:16, marginBottom:10, boxShadow:'0 2px 12px rgba(107,33,168,0.06)', borderLeft:`3px solid ${a.level==='CRITICAL'?'#DC2626':a.level==='HIGH'?'#D97706':'#F59E0B'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <span style={{ background:a.level==='CRITICAL'?'#FEE2E2':a.level==='HIGH'?'#FEF3C7':'#FEF9C3', color:a.level==='CRITICAL'?'#DC2626':a.level==='HIGH'?'#D97706':'#CA8A04', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
                      {a.level}
                    </span>
                    <span style={{ fontSize:11, color:'#9CA3AF' }}>{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize:13, color:'#374151', marginBottom:10, lineHeight:1.5 }}>{a.message}</p>
                  {!a.acknowledged && (
                    <button onClick={() => acknowledgeAlert(a._id)}
                      style={{ background:PURPLE, color:'white', border:'none', borderRadius:8, padding:'6px 14px', fontSize:12, cursor:'pointer' }}>
                      Acknowledge
                    </button>
                  )}
                  {a.acknowledged && <span style={{ fontSize:11, color:'#16A34A' }}>✓ Acknowledged by {a.acknowledgedBy}</span>}
                </div>
              ))
            }
          </>}

        </div>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
