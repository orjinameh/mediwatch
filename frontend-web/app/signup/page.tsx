'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PURPLE, PURPLE_DARK } from '@/lib/theme';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ name:'', email:'', password:'', confirmPassword:'', role:'doctor' });
  const [error, setError]  = useState('');
  const [loading, setLoad] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) { setError('All fields are required'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoad(true); setError('');
    const res = await authApi.signup({ name: form.name, email: form.email, password: form.password, role: form.role });
    if (res.success) {
      login(res.data.token, res.data.user);
      router.push('/home');
    } else {
      setError(res.error || 'Signup failed');
    }
    setLoad(false);
  };

  const inputStyle: any = { border:'none', outline:'none', flex:1, fontSize:15, color:'#111', background:'transparent' };
  const rowStyle: any = { display:'flex', alignItems:'center', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'12px 16px', marginBottom:14, gap:10 };

  return (
    <div style={{ minHeight:'100vh', background:`linear-gradient(160deg, ${PURPLE_DARK} 0%, ${PURPLE} 100%)`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>

      <div style={{ width:80, height:80, background:'white', borderRadius:22, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, fontSize:40, boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>⚕️</div>
      <h1 style={{ color:'white', fontSize:26, fontWeight:800, marginBottom:4 }}>Create Account</h1>
      <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14, marginBottom:28, textAlign:'center' }}>Join MediWatch AI to monitor<br />your patients in real time</p>

      <div style={{ background:'white', borderRadius:24, padding:28, width:'100%', maxWidth:380, boxShadow:'0 24px 64px rgba(0,0,0,0.3)' }}>
        {error && <div style={{ background:'#FEE2E2', color:'#DC2626', padding:'10px 14px', borderRadius:10, marginBottom:16, fontSize:13 }}>{error}</div>}

        {/* Full name */}
        <div style={rowStyle}>
          <span style={{ fontSize:18 }}>👤</span>
          <input value={form.name} onChange={set('name')} placeholder="Full name" style={inputStyle} />
        </div>

        {/* Email */}
        <div style={rowStyle}>
          <span style={{ fontSize:18 }}>✉️</span>
          <input type="email" value={form.email} onChange={set('email')} placeholder="Email address" style={inputStyle} />
        </div>

        {/* Role */}
        <div style={{ border:'1.5px solid #E5E7EB', borderRadius:12, padding:'12px 16px', marginBottom:14 }}>
          <select value={form.role} onChange={set('role')}
            style={{ border:'none', outline:'none', width:'100%', fontSize:15, color:'#111', background:'transparent', appearance:'none' as const }}>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Password */}
        <div style={rowStyle}>
          <span style={{ fontSize:18 }}>🔒</span>
          <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Password (min 6 chars)" style={inputStyle} />
          <span onClick={() => setShowPw(s=>!s)} style={{ cursor:'pointer', fontSize:16, color:'#9CA3AF' }}>{showPw ? '🙈' : '👁️'}</span>
        </div>

        {/* Confirm password */}
        <div style={rowStyle}>
          <span style={{ fontSize:18 }}>🔒</span>
          <input type={showPw ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Confirm password"
            onKeyDown={e => e.key==='Enter' && handleSignup()} style={inputStyle} />
        </div>

        <button onClick={handleSignup} disabled={loading}
          style={{ width:'100%', background:PURPLE, color:'white', border:'none', borderRadius:12, padding:'15px', fontSize:16, fontWeight:700, cursor:loading?'not-allowed':'pointer', marginBottom:16, opacity:loading?0.7:1 }}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p style={{ textAlign:'center', fontSize:13, color:'#6B7280' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color:PURPLE, fontWeight:600, textDecoration:'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
