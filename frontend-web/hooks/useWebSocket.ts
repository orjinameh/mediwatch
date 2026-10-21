'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { WS } from '@/lib/theme';

export function useWebSocket() {
  const ws  = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [vitalsMap, setVitalsMap] = useState<Record<string, any>>({});
  const [alerts, setAlerts]       = useState<any[]>([]);
  const wanted = useRef<Set<string>>(new Set(['ALL']));

  useEffect(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      const token = localStorage.getItem('mw_token');
      if (!token) return;
      const sock = new WebSocket(`${WS}?token=${encodeURIComponent(token)}`);
      ws.current = sock;
      sock.onopen = () => {
        setConnected(true);
        wanted.current.forEach(id => sock.send(JSON.stringify({ type: 'SUBSCRIBE_PATIENT', patientId: id })));
      };
      sock.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'VITALS_UPDATE') {
            const data = { ...msg.data, timestamp: msg.data?.timestamp || msg.timestamp };
            setVitalsMap(p => ({ ...p, [msg.patientId]: data }));
          }
          if (msg.type === 'ALERT') setAlerts(p => [{ ...msg.data, timestamp: msg.data?.timestamp || msg.timestamp }, ...p.slice(0, 19)]);
        } catch (_) {}
      };
      sock.onclose = (ev) => {
        setConnected(false);
        if (closed || ev.code === 4401) return;   // 4401 = bad/expired token, don't retry
        timer = setTimeout(connect, 4000);
      };
      sock.onerror = () => sock.close();
    };
    connect();
    return () => { closed = true; if (timer) clearTimeout(timer); ws.current?.close(); };
  }, []);

  const subscribe = useCallback((patientId: string) => {
    wanted.current.add(patientId);
    if (ws.current?.readyState === 1) ws.current.send(JSON.stringify({ type: 'SUBSCRIBE_PATIENT', patientId }));
  }, []);

  return { connected, vitalsMap, alerts, subscribe };
}
