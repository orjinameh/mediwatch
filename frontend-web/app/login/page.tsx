'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PURPLE, PURPLE_DARK } from '@/lib/theme';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm]     = useState({ email:'', password:'' });
  const [remember, setRemember] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoad]  = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    setLoad(true); setError('');
    const res = await authApi.login(form);
    if (res.success) {
      login(res.data.token, res.data.user);
      router.push('/home');
    } else {
      setError(res.error || 'Invalid credentials');
    }
    setLoad(false);
  };

  return (
    <div style={{ minHeight:'100vh', background:`linear-gradient(160deg, ${PURPLE_DARK} 0%, ${PURPLE} 100%)`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>

      <div style={{ width:90, height:90, background:'white', borderRadius:22, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, fontSize:44, boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>⚕️</div>
      <p style={{ color:'rgba(255,255,255,0.8)', fontSize:14, marginBottom:4 }}>welcome back</p>
      <h1 style={{ color:'white', fontSize:28, fontWeight:800, marginBottom:6 }}>Doctor's Login</h1>
      <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14, marginBottom:32, textAlign:'center' }}>Sign in to continue monitoring<br />your patients</p>

      <div style={{ background:'white', borderRadius:24, padding:28, width:'100%', maxWidth:380, boxShadow:'0 24px 64px rgba(0,0,0,0.3)' }}>
        {error && <div style={{ background:'#FEE2E2', color:'#DC2626', padding:'10px 14px', borderRadius:10, marginBottom:16, fontSize:13 }}>{error}</div>}

        {/* Email */}
        <div style={{ display:'flex', alignItems:'center', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'12px 16px', marginBottom:14, gap:10 }}>
          <span style={{ fontSize:18 }}>✉️</span>
          <input type="email" value={form.email} onChange={set('email')} placeholder="Email address"
            style={{ border:'none', outline:'none', flex:1, fontSize:15, color:'#111', background:'transparent' }} />
        </div>

        {/* Password */}
        <div style={{ display:'flex', alignItems:'center', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'12px 16px', marginBottom:14, gap:10 }}>
          <span style={{ fontSize:18 }}>🔒</span>
          <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Password"
            onKeyDown={e => e.key==='Enter' && handleLogin()}
            style={{ border:'none', outline:'none', flex:1, fontSize:15, color:'#111', background:'transparent' }} />
          <span onClick={() => setShowPw(s=>!s)} style={{ cursor:'pointer', fontSize:16, color:'#9CA3AF' }}>{showPw ? '🙈' : '👁️'}</span>
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#6B7280', cursor:'pointer' }}>
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{ accentColor:PURPLE }} />
            Remember me
          </label>
          <span style={{ fontSize:13, color:PURPLE, cursor:'pointer' }}>Forgotten password</span>
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{ width:'100%', background:PURPLE, color:'white', border:'none', borderRadius:12, padding:'15px', fontSize:16, fontWeight:700, cursor:loading?'not-allowed':'pointer', marginBottom:16, opacity:loading?0.7:1 }}>
          {loading ? 'Signing in...' : 'Login'}
        </button>

        <div style={{ textAlign:'center', color:'#9CA3AF', fontSize:13, marginBottom:16 }}>or</div>

        <button style={{ width:'100%', background:'white', color:'#111', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'13px', fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:20 }}>
          <span style={{ fontSize:20, fontWeight:700, color:'#4285F4' }}>G</span> Continue with Google
        </button>

        <p style={{ textAlign:'center', fontSize:13, color:'#6B7280' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color:PURPLE, fontWeight:600, textDecoration:'none' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
