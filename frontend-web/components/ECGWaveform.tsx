'use client';
import { useEffect, useRef } from 'react';

export default function ECGWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;
    let phase = 0;
    const pts: { x: number; y: number }[] = [];
    const speed = 1.8;

    const ecgVal = (p: number) => {
      const mod = p % (Math.PI * 2);
      if (mod < 0.3) return Math.sin(mod * 10) * 6;
      if (mod < 0.5) return -Math.sin((mod - 0.3) * 15) * 10;
      if (mod < 0.7) return Math.sin((mod - 0.5) * 30) * 45;
      if (mod < 0.9) return -Math.sin((mod - 0.7) * 15) * 14;
      if (mod < 1.1) return Math.sin((mod - 0.9) * 10) * 8;
      return 0;
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(253,242,248,0.4)';
      ctx.fillRect(0, 0, w, h);
      phase += 0.05;
      pts.push({ x: pts.length * speed, y: h / 2 - ecgVal(phase) });
      if (pts.length > w / speed) pts.shift();
      ctx.beginPath();
      ctx.strokeStyle = '#E91E8C';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#E91E8C';
      ctx.shadowBlur = 4;
      pts.forEach((pt, i) => {
        const rx = i * speed;
        if (i === 0) ctx.moveTo(rx, pt.y); else ctx.lineTo(rx, pt.y);
      });
      ctx.stroke();
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return <canvas ref={canvasRef} width={340} height={64} style={{ width: '100%', height: 64, borderRadius: 8, display: 'block' }} />;
}
