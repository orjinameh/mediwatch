'use client';
import { useEffect, useRef } from 'react';

// Draws the ECG samples that the device actually sent. Nothing is generated here.
export default function ECGWaveform({ data }: { data?: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!data || data.length < 2) return;
    const min = Math.min(...data), max = Math.max(...data);
    const span = max - min || 1;
    ctx.beginPath();
    ctx.strokeStyle = '#E91E8C'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - 6 - ((v - min) / span) * (h - 12);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data]);

  return <canvas ref={ref} role="img" aria-label="ECG waveform" style={{ width:'100%', height:64, borderRadius:8, display:'block' }} />;
}
