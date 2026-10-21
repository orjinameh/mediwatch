'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { PURPLE, PURPLE_DARK } from '@/lib/theme';
import { patientApi } from '@/lib/api';
import BottomNav from '@/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';

const EMPTY = { name:'', age:'', gender:'', condition:'', ward:'', roomNumber:'', bloodGroup:'', phone:'', emergencyContact:'' };

export default function AddPatientPage() {
  const router = useRouter();
  const [form, setForm]    = useState(EMPTY);
  const [error, setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Patient name is required'); return; }
    const age = form.age ? Number(form.age) : undefined;
    if (age !== undefined && (!Number.isFinite(age) || age < 0 || age > 130)) { setError('Enter a valid age'); return; }
    setSaving(true); setError('');
    const body: Record<string, any> = {};
    (Object.keys(form) as (keyof typeof EMPTY)[]).forEach(k => { if (form[k].trim()) body[k] = form[k].trim(); });
    if (age !== undefined) body.age = age;
    const res = await patientApi.create(body);
    if (res.success) router.replace(`/patients/${res.data.patientId}`);
    else { setError(res.error || 'Could not add patient'); setSaving(false); }
  };

  const inp: React.CSSProperties = { border:'1.5px solid #E5E7EB', borderRadius:12, padding:'12px 14px', fontSize:15, color:'#111', outline:'none', width:'100%', background:'white' };
  const lbl: React.CSSProperties = { fontSize:12, color:'#6B7280', marginBottom:6, display:'block' };
  const field = (id: keyof typeof EMPTY, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div style={{ marginBottom:14 }}>
      <label htmlFor={id} style={lbl}>{label}</label>
      <input id={id} value={form[id]} onChange={set(id)} style={inp} {...props} />
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="mw-shell">
        <div style={{ background:`linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, padding:'52px 20px 24px', borderRadius:'0 0 30px 30px', display:'flex', alignItems:'center', gap:14 }}>
          <button onClick={() => router.back()} aria-label="Go back" style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:10, width:36, height:36, color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="arrowLeft" /></button>
          <h2 style={{ color:'white', fontSize:22, fontWeight:800, margin:0 }}>Add Patient</h2>
        </div>

        <form className="mw-pad" onSubmit={submit} noValidate>
          <div style={{ background:'white', borderRadius:20, padding:20, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' }}>
            {error && <div role="alert" style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', borderRadius:12, padding:'10px 14px', fontSize:13, marginBottom:14 }}>{error}</div>}
            {field('name', 'Full name *', { autoComplete:'off', placeholder:'e.g. James Osei' })}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12 }}>
              {field('age', 'Age', { type:'number', inputMode:'numeric', min:0, max:130 })}
              <div style={{ marginBottom:14 }}>
                <label htmlFor="gender" style={lbl}>Gender</label>
                <select id="gender" value={form.gender} onChange={set('gender')} style={inp}>
                  <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>
            {field('condition', 'Condition', { placeholder:'e.g. Post-op cardiac' })}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12 }}>
              {field('ward', 'Ward')}
              {field('roomNumber', 'Room number')}
            </div>
            {field('bloodGroup', 'Blood group', { placeholder:'e.g. O+' })}
            {field('phone', 'Phone', { type:'tel', inputMode:'tel' })}
            {field('emergencyContact', 'Emergency contact')}
            <button type="submit" disabled={saving}
              style={{ width:'100%', background:PURPLE, color:'white', border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:600, cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Saving...' : 'Add Patient'}
            </button>
          </div>
        </form>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
