'use client';
import { useRouter } from 'next/navigation';
import { PURPLE, PURPLE_DARK } from '@/lib/theme';

export default function SettingsPage() {
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem('doctor');
    router.push('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F5FF', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})`, padding: '50px 20px 28px', borderRadius: '0 0 30px 30px' }}>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700 }}>Settings</h2>
      </div>

      <div style={{ padding: '20px 16px', paddingBottom: 100 }}>
        {[
          { icon: '👤', label: 'Profile', sub: 'Manage your account' },
          { icon: '🔔', label: 'Notifications', sub: 'Alert preferences' },
          { icon: '🔒', label: 'Privacy & Security', sub: 'Data and access' },
          { icon: '🏥', label: 'Clinic Settings', sub: 'Ward and facility' },
          { icon: '❓', label: 'Help & Support', sub: 'Get assistance' },
        ].map(({ icon, label, sub }) => (
          <div key={label} style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxShadow: '0 2px 12px rgba(107,33,168,0.06)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: PURPLE + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>{label}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>{sub}</div>
            </div>
            <span style={{ fontSize: 18, color: '#9CA3AF' }}>›</span>
          </div>
        ))}

        <button onClick={logout}
          style={{ width: '100%', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 16, padding: '16px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 10 }}>
          Sign Out
        </button>
      </div>

      {/* Bottom nav imported inline since we need it */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: 'white', borderTop: '1px solid #F3F4F6', display: 'flex', padding: '10px 0 20px', zIndex: 100 }}>
        {[{p:'/home',i:'🏠',l:'Home'},{p:'/patients',i:'👥',l:'patients'},{p:'/settings',i:'⚙️',l:'settings'}].map(({p,i,l})=>(
          <button key={p} onClick={()=>router.push(p)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:4}}>
            <div style={{width:42,height:42,borderRadius:12,background:p==='/settings'?PURPLE:'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{i}</div>
            <span style={{fontSize:11,color:p==='/settings'?PURPLE:'#9CA3AF'}}>{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
