'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PURPLE, PURPLE_DARK, news2Color } from '@/lib/theme';
import { apiFetch } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import ECGWaveform from '@/components/ECGWaveform';
import BottomNav from '@/components/BottomNav';

const VCard = ({ icon, label, value, unit, sub, color }: any) => (
  <div style={{ background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(107,33,168,0.06)', flex:'1 1 45%' }}>
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
      <span style={{ fontSize:22 }}>{icon}</span>
      <span style={{ fontSize:11, color:'#9CA3AF', fontWeight:500 }}>{label}</span>
    </div>
    <div style={{ fontSize:28, fontWeight:800, color:color||'#111', lineHeight:1 }}>{value}</div>
    {unit && <div style={{ fontSize:12, color:color||PURPLE, marginTop:4 }}>{unit}</div>}
    {sub  && <div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>{sub}</div>}
  </div>
);

export default function PatientDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id:string }>();
  const [patient, setPatient] = useState<any>(null);
  const [vitals,  setVitals]  = useState<any>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResp,  setAiResp]  = useState('');
  const [aiLoad,  setAiLoad]  = useState(false);
  const [showAI,  setShowAI]  = useState(false);
  const { vitalsMap, subscribe } = useWebSocket();

  useEffect(() => {
    if (!id) return;
    subscribe(id);
    Promise.all([apiFetch(`/api/patients/${id}`), apiFetch(`/api/vitals/${id}/latest`)])
      .then(([p, v]) => { if (p.success) setPatient(p.data); if (v.success) setVitals(v.data); });
  }, [id]);

  useEffect(() => { if (id && vitalsMap[id]) setVitals(vitalsMap[id]); }, [vitalsMap, id]);

  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoad(true);
    const res = await apiFetch(`/api/ai/${id}`, { method:'POST', body:JSON.stringify({ query:aiQuery, askedBy:'nurse' }) });
    if (res.success) setAiResp(res.data.response);
    setAiLoad(false);
  };

  const V = vitals;
  const nc = news2Color(V?.news2Score || 0);
  const statusLabel = V?.news2Level === 'CRITICAL' || V?.news2Level === 'HIGH' ? 'attention' : 'stable';

  if (!patient) return (
    <div style={{ minHeight:'100vh', background:PURPLE_DARK, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'white', fontSize:16 }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#F8F5FF', maxWidth:430, margin:'0 auto' }}>
      <div style={{ background:`linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, padding:'52px 20px 28px', borderRadius:'0 0 30px 30px' }}>
        <button onClick={() => router.back()} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:10, width:36, height:36, color:'white', fontSize:18, cursor:'pointer', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
        <div style={{ display:'flex', gap:14 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, border:'2px solid rgba(255,255,255,0.5)', flexShrink:0 }}>👤</div>
          <div style={{ flex:1 }}>
            <h2 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:2 }}>{patient.name}</h2>
            <p style={{ color:'rgba(255,255,255,0.8)', fontSize:13, marginBottom:4 }}>{patient.age||'—'} Years • {patient.gender||'Unknown'}</p>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:12, marginBottom:8 }}>{patient.ward||'Room'} {patient.patientId?.slice(-5)} • ID:{patient.patientId?.slice(0,8)}</p>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'rgba(255,255,255,0.8)', fontSize:12 }}>• Monitoring ongoing. Vitals normal</span>
              <span style={{ background:'rgba(255,255,255,0.25)', color:'white', fontSize:11, fontWeight:600, padding:'4px 12px', borderRadius:20, border:'1px solid rgba(255,255,255,0.4)' }}>{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'20px 16px', paddingBottom:100 }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:14 }}>
          <VCard icon="🫁" label="Respiratory Rate" value={V?.respRate ? Math.round(V.respRate) : '—'} unit="breath/min" color={PURPLE} />
          <VCard icon="❤️" label="Heart Rate"       value={V?.heartRate ? Math.round(V.heartRate) : '—'} unit="bpm" color="#EF4444" />
          <VCard icon="💧" label="SpO2"             value={V?.spo2 ? `${V.spo2.toFixed(0)}%` : '—'} color={V?.spo2 < 93 ? '#EF4444' : PURPLE} />
          <VCard icon="〰️" label="ECG"             value="Normal" sub="Sinus Rhythm" color="#111" />
        </div>

        <div style={{ background:'white', borderRadius:16, padding:16, marginBottom:14, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:14, fontWeight:700, color:'#111' }}>ECG Waveform</span>
            <span style={{ fontSize:12, color:'#9CA3AF' }}>10mm/mv</span>
          </div>
          <div style={{ background:'#FDF2F8', borderRadius:12, padding:10 }}><ECGWaveform /></div>
        </div>

        <div style={{ display:'flex', gap:12, marginBottom:14 }}>
          <div style={{ flex:1, background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}><span style={{ fontSize:22 }}>🩺</span><span style={{ fontSize:11, color:'#9CA3AF' }}>Blood Pressure</span></div>
            <div style={{ fontSize:22, fontWeight:800, color:'#111' }}>{V?.systolic && V?.diastolic ? `${Math.round(V.systolic)}/${Math.round(V.diastolic)}` : '—'}</div>
          </div>
          <div style={{ flex:1, background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}><span style={{ fontSize:22 }}>🌡️</span><span style={{ fontSize:11, color:'#9CA3AF' }}>Temp.</span></div>
            <div style={{ fontSize:22, fontWeight:800, color:'#EF4444' }}>{V?.temperature ? `${V.temperature.toFixed(1)}C` : '—'}</div>
          </div>
        </div>

        <div style={{ background:'white', borderRadius:16, padding:16, marginBottom:14, boxShadow:'0 2px 12px rgba(107,33,168,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, color:'#9CA3AF', marginBottom:4 }}>NEWS2 Early Warning Score</div>
            <div style={{ fontSize:36, fontWeight:800, color:nc }}>{V?.news2Score ?? '—'}</div>
          </div>
          <div style={{ background:nc+'20', borderRadius:14, padding:'12px 20px', textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:700, color:nc }}>{V?.news2Level || 'LOW'}</div>
            <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>Risk Level</div>
          </div>
        </div>

        <div style={{ background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:showAI?14:0 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#111' }}>🤖 AI Assistant Doctor</div>
              <div style={{ fontSize:11, color:'#9CA3AF' }}>Available 24/7 when doctor is away</div>
            </div>
            <button onClick={() => setShowAI(s=>!s)} style={{ background:PURPLE, color:'white', border:'none', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              {showAI ? 'Hide' : 'Ask'}
            </button>
          </div>
          {showAI && <>
            {aiResp && <div style={{ background:'#F3E8FF', borderRadius:12, padding:14, marginBottom:12, fontSize:13, color:'#4B0082', lineHeight:1.7 }}>{aiResp}</div>}
            <div style={{ display:'flex', gap:8 }}>
              <input value={aiQuery} onChange={e=>setAiQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&askAI()} placeholder="Ask about this patient..."
                style={{ flex:1, border:'1.5px solid #E9D5FF', borderRadius:12, padding:'10px 14px', fontSize:13, outline:'none', color:'#111' }} />
              <button onClick={askAI} disabled={aiLoad} style={{ background:PURPLE, color:'white', border:'none', borderRadius:12, padding:'10px 18px', fontSize:13, fontWeight:600, cursor:aiLoad?'not-allowed':'pointer', opacity:aiLoad?0.7:1 }}>
                {aiLoad ? '...' : 'Send'}
              </button>
            </div>
          </>}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
