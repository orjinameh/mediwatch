export const PURPLE = '#6B21A8';
export const PURPLE_DARK = '#4A0E78';
export const PURPLE_LIGHT = '#F3E8FF';
export const PURPLE_MID = '#9333EA';

export const API_URL = 'https://your-mediwatch-backend.onrender.com';
export const WS_URL  = 'wss://your-mediwatch-backend.onrender.com';

export const STATUS_COLORS = {
  stable:    { bg: '#DCFCE7', text: '#16A34A' },
  attention: { bg: '#FEF3C7', text: '#D97706' },
  critical:  { bg: '#FEE2E2', text: '#DC2626' },
};

export const news2Color = (score: number) => {
  if (score >= 7) return '#DC2626';
  if (score >= 5) return '#D97706';
  if (score >= 3) return '#F59E0B';
  return '#16A34A';
};
