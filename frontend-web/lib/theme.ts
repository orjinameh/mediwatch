export const PURPLE = '#6B21A8';
export const PURPLE_DARK = '#4A0E78';
export const PURPLE_LIGHT = '#F3E8FF';

export const STATUS: Record<string, { bg: string; color: string; label: string }> = {
  stable:    { bg: '#DCFCE7', color: '#16A34A', label: 'Stable' },
  attention: { bg: '#FEF3C7', color: '#D97706', label: 'Attention' },
  critical:  { bg: '#FEE2E2', color: '#DC2626', label: 'Critical' },
};

export const news2Color = (score: number) => {
  if (score >= 7) return '#DC2626';
  if (score >= 5) return '#D97706';
  if (score >= 3) return '#F59E0B';
  return '#16A34A';
};

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const WS  = process.env.NEXT_PUBLIC_WS_URL  || 'ws://localhost:5000';
