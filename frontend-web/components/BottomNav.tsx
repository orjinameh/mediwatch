'use client';
import { useRouter, usePathname } from 'next/navigation';
import { PURPLE } from '@/lib/theme';

const NAV = [
  { path:'/home',     emoji:'🏠', label:'Home' },
  { path:'/patients', emoji:'👥', label:'patients' },
  { path:'/settings', emoji:'⚙️', label:'settings' },
];

export default function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();
  return (
    <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:'white', borderTop:'1px solid #F3F4F6', display:'flex', padding:'10px 0 24px', zIndex:100, boxShadow:'0 -4px 20px rgba(0,0,0,0.06)' }}>
      {NAV.map(({ path, emoji, label }) => {
        const active = pathname.startsWith(path);
        return (
          <button key={path} onClick={() => router.push(path)}
            style={{ flex:1, background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:active ? PURPLE : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{emoji}</div>
            <span style={{ fontSize:11, color:active ? PURPLE : '#9CA3AF', fontWeight:active ? 600 : 400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
