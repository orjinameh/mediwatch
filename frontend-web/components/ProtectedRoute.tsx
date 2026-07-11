'use client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PURPLE_DARK } from '@/lib/theme';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:PURPLE_DARK, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.2)', borderTopColor:'white', animation:'spin 0.8s linear infinite' }}/>
      <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14 }}>Loading MediWatch...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return null;
  return <>{children}</>;
}
