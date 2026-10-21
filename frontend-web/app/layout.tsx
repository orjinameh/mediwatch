import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata: Metadata = {
  title: 'MediWatch AI',
  description: 'IoT Patient Monitoring System',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#4A0E78' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin:0, padding:0, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background:'#F8F5FF' }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
