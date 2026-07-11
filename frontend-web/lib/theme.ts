export const PURPLE      = '#6B21A8';
export const PURPLE_DARK = '#4A0E78';
export const PURPLE_MID  = '#9333EA';

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const WS  = process.env.NEXT_PUBLIC_WS_URL  || 'ws://localhost:5000';

export const STATUS: Record<string, {bg:string;color:string;label:string}> = {
  stable:    { bg:'#DCFCE7', color:'#16A34A', label:'Stable' },
  attention: { bg:'#FEF3C7', color:'#D97706', label:'Attention' },
  critical:  { bg:'#FEE2E2', color:'#DC2626', label:'Critical' },
};

export const news2Color = (s: number) =>
  s >= 7 ? '#DC2626' : s >= 5 ? '#D97706' : s >= 3 ? '#F59E0B' : '#16A34A';

export const news2Label = (s: number) =>
  s >= 7 ? 'CRITICAL' : s >= 5 ? 'HIGH' : s >= 3 ? 'MEDIUM' : 'LOW';
