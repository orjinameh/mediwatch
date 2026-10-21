'use client';
import { useEffect, useState } from 'react';

// Re-renders the caller every `ms` so "is this reading stale?" stays accurate
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
