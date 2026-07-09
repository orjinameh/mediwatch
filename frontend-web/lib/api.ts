import { API } from '@/lib/theme';

export const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
};
