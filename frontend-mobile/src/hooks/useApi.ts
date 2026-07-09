import { useEffect, useRef, useState, useCallback } from 'react';
import { API_URL, WS_URL } from '../theme';

export const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
};

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [vitalsMap, setVitalsMap] = useState<Record<string, any>>({});
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const connect = () => {
      try {
        ws.current = new WebSocket(WS_URL);
        ws.current.onopen = () => {
          setConnected(true);
          ws.current?.send(JSON.stringify({ type: 'SUBSCRIBE_PATIENT', patientId: 'ALL' }));
        };
        ws.current.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'VITALS_UPDATE') {
              setVitalsMap(prev => ({ ...prev, [msg.patientId]: msg.data }));
            }
            if (msg.type === 'ALERT') {
              setAlerts(prev => [msg.data, ...prev.slice(0, 19)]);
            }
          } catch (_) {}
        };
        ws.current.onclose = () => { setConnected(false); setTimeout(connect, 4000); };
        ws.current.onerror = () => ws.current?.close();
      } catch (_) {}
    };
    connect();
    return () => ws.current?.close();
  }, []);

  const subscribe = useCallback((patientId: string) => {
    if (ws.current?.readyState === 1) {
      ws.current.send(JSON.stringify({ type: 'SUBSCRIBE_PATIENT', patientId }));
    }
  }, []);

  return { connected, vitalsMap, alerts, subscribe };
}
