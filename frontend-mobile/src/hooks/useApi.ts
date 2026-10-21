import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, WS_URL } from '../theme';

// Session is stored by LoginScreen as { token, user }
export const getSession = async (): Promise<{ token: string; user: any } | null> => {
  try {
    const raw = await AsyncStorage.getItem('doctor');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const session = await getSession();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    return { success: false, error: 'Cannot reach the server. Check your connection.' };
  }
  const data = await res.json().catch(() => ({ success: false, error: `Server error (${res.status})` }));
  if (res.status === 401 && !path.startsWith('/api/auth/login')) {
    await AsyncStorage.removeItem('doctor');
    return { ...data, success: false, unauthorized: true };
  }
  return data;
};

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const wanted = useRef<Set<string>>(new Set(['ALL']));
  const [connected, setConnected] = useState(false);
  const [vitalsMap, setVitalsMap] = useState<Record<string, any>>({});
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      if (closed) return;
      const session = await getSession();
      if (!session?.token || closed) return;
      const sock = new WebSocket(`${WS_URL}?token=${encodeURIComponent(session.token)}`);
      ws.current = sock;
      sock.onopen = () => {
        setConnected(true);
        wanted.current.forEach(id => sock.send(JSON.stringify({ type: 'SUBSCRIBE_PATIENT', patientId: id })));
      };
      sock.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === 'VITALS_UPDATE') {
            const data = { ...msg.data, timestamp: msg.data?.timestamp || msg.timestamp };
            setVitalsMap(prev => ({ ...prev, [msg.patientId]: data }));
          }
          if (msg.type === 'ALERT') {
            setAlerts(prev => [{ ...msg.data, timestamp: msg.data?.timestamp || msg.timestamp }, ...prev.slice(0, 19)]);
          }
        } catch (_) {}
      };
      sock.onclose = (ev: any) => {
        setConnected(false);
        if (closed || ev?.code === 4401) return;
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

// Re-render every `ms` so stale-reading checks stay accurate
export function useNow(ms = 5000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
