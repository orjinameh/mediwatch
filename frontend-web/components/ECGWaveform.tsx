'use client';
import { useEffect, useRef } from 'react';

export default function ECGWaveform() {
  const ref   = useRef<HTMLCanvasElement>(null);
  const frame = useRef<number>(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const w = c.width, h = c.height;
    let phase = 0;
    const pts: {x:number;y:number}[] = [];
    const ecg = (p: number) => {
      const m = p % (Math.PI*2);
      if (m<0.3)  return Math.sin(m*10)*6;
      if (m<0.5)  return -Math.sin((m-0.3)*15)*10;
      if (m<0.7)  return Math.sin((m-0.5)*30)*45;
      if (m<0.9)  return -Math.sin((m-0.7)*15)*14;
      if (m<1.1)  return Math.sin((m-0.9)*10)*8;
      return 0;
    };
    const draw = () => {
      ctx.fillStyle = 'rgba(253,242,248,0.4)'; ctx.fillRect(0,0,w,h);
      phase += 0.05;
      pts.push({ x: pts.length*1.8, y: h/2 - ecg(phase) });
      if (pts.length > w/1.8) pts.shift();
      ctx.beginPath(); ctx.strokeStyle='#E91E8C'; ctx.lineWidth=1.8; ctx.shadowColor='#E91E8C'; ctx.shadowBlur=4;
      pts.forEach((p,i) => { if(i===0) ctx.moveTo(i*1.8,p.y); else ctx.lineTo(i*1.8,p.y); });
      ctx.stroke();
      frame.current = requestAnimationFrame(draw);
    };
    frame.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame.current);
  }, []);
  return <canvas ref={ref} width={340} height={64} style={{ width:'100%', height:64, borderRadius:8, display:'block' }} />;
}
