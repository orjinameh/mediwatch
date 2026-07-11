'use client';
import { useState } from 'react';
import { PURPLE, PURPLE_DARK } from '@/lib/theme';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import BottomNav from '@/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<'profile'|'security'|'about'>('profile');
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [pwError, setPwError]     = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw]       = useState(false);

  const setPw = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPwForm(f => ({ ...f, [k]: e.target.value }));

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) { setPwError('All fields required'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match'); return; }
    setPwLoading(true); setPwError(''); setPwSuccess('');
    const res = await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
    if (res.success) {
      setPwSuccess('Password changed successfully!');
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } else {
      setPwError(res.error || 'Failed to change password');
    }
    setPwLoading(false);
  };

  const inp: any = { border:'1.5px solid #E5E7EB', borderRadius:12, padding:'12px 16px', fontSize:15, color:'#111', outline:'none', width:'100%', background:'white' };
  const card: any = { background:'white', borderRadius:20, padding:20, marginBottom:14, boxShadow:'0 2px 12px rgba(107,33,168,0.06)' };

  const MENU = [
    { icon:'👤', label:'Profile',           sub:'Your account information' },
    { icon:'🔒', label:'Security',          sub:'Password & privacy' },
    { icon:'🔔', label:'Notifications',     sub:'Alert preferences' },
    { icon:'🏥', label:'Clinic Settings',   sub:'Ward and facility info' },
    { icon:'❓', label:'Help & Support',    sub:'Documentation and contact' },
    { icon:'ℹ️', label:'About MediWatch AI', sub:'Version 1.0.0 — IoT Patient Monitor' },
  ];

  return (
    <ProtectedRoute>
      <div style={{ minHeight:'100vh', background:'#F8F5FF', maxWidth:430, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, padding:'52px 20px 28px', borderRadius:'0 0 30px 30px' }}>
          <h2 style={{ color:'white', fontSize:24, fontWeight:800 }}>Settings</h2>
        </div>

        {/* Profile card */}
        <div style={{ margin:'16px 16px 0', background:'white', borderRadius:20, padding:20, display:'flex', alignItems:'center', gap:16, boxShadow:'0 4px 20px rgba(107,33,168,0.08)' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:PURPLE+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>👨‍⚕️</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#111', marginBottom:2 }}>{user?.name}</div>
            <div style={{ fontSize:13, color:'#9CA3AF', marginBottom:6 }}>{user?.email}</div>
            <span style={{ background:PURPLE+'15', color:PURPLE, fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20 }}>
              {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
            </span>
          </div>
        </div>

        <div style={{ padding:'16px', paddingBottom:100 }}>

          {/* Change Password section */}
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:700, color:'#111', marginBottom:4 }}>🔒 Change Password</div>
            <div style={{ fontSize:12, color:'#9CA3AF', marginBottom:16 }}>Update your account password</div>

            {pwError   && <div style={{ background:'#FEE2E2', color:'#DC2626', padding:'10px 14px', borderRadius:10, marginBottom:12, fontSize:13 }}>{pwError}</div>}
            {pwSuccess && <div style={{ background:'#DCFCE7', color:'#16A34A', padding:'10px 14px', borderRadius:10, marginBottom:12, fontSize:13 }}>✅ {pwSuccess}</div>}

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>Current Password</label>
              <div style={{ display:'flex', alignItems:'center', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'12px 16px', gap:10 }}>
                <input type={showPw ? 'text' : 'password'} value={pwForm.currentPassword} onChange={setPw('currentPassword')} placeholder="Enter current password"
                  style={{ border:'none', outline:'none', flex:1, fontSize:15, color:'#111', background:'transparent' }} />
                <span onClick={() => setShowPw(s=>!s)} style={{ cursor:'pointer', fontSize:16, color:'#9CA3AF' }}>{showPw ? '🙈' : '👁️'}</span>
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>New Password</label>
              <input type={showPw ? 'text' : 'password'} value={pwForm.newPassword} onChange={setPw('newPassword')} placeholder="Min 6 characters" style={inp} />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>Confirm New Password</label>
              <input type={showPw ? 'text' : 'password'} value={pwForm.confirmPassword} onChange={setPw('confirmPassword')} placeholder="Repeat new password"
                onKeyDown={e => e.key==='Enter' && handleChangePassword()} style={inp} />
            </div>

            <button onClick={handleChangePassword} disabled={pwLoading}
              style={{ width:'100%', background:PURPLE, color:'white', border:'none', borderRadius:12, padding:'13px', fontSize:15, fontWeight:700, cursor:pwLoading?'not-allowed':'pointer', opacity:pwLoading?0.7:1 }}>
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>

          {/* Menu items */}
          {MENU.filter(m => m.label !== 'Security').map(({ icon, label, sub }) => (
            <div key={label} style={{ background:'white', borderRadius:16, padding:16, marginBottom:10, display:'flex', alignItems:'center', gap:14, cursor:'pointer', boxShadow:'0 2px 12px rgba(107,33,168,0.05)' }}>
              <div style={{ width:44, height:44, borderRadius:12, background:PURPLE+'15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15, color:'#111' }}>{label}</div>
                <div style={{ fontSize:12, color:'#9CA3AF' }}>{sub}</div>
              </div>
              <span style={{ fontSize:18, color:'#9CA3AF' }}>›</span>
            </div>
          ))}

          {/* Sign out */}
          <button onClick={logout}
            style={{ width:'100%', background:'#FEE2E2', color:'#DC2626', border:'none', borderRadius:16, padding:16, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:8 }}>
            Sign Out
          </button>

          <p style={{ textAlign:'center', fontSize:11, color:'#9CA3AF', marginTop:16 }}>
            MediWatch AI v1.0.0 · IoT Patient Monitoring System<br />
            Built with ❤️ for Nigerian healthcare
          </p>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
