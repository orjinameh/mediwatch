import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MediWatch AI',
  description: 'IoT Patient Monitoring System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#F8F5FF' }}>
        {children}
      </body>
    </html>
  );
}
