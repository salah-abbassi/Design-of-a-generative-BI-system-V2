const DEFAULT_BASE = 'http://127.0.0.1:8000';

export function getApiBase() {
  const v = import.meta.env.VITE_API_BASE;
  if (v && String(v).trim()) {
    return String(v).replace(/\/$/, '');
  }
  return DEFAULT_BASE;
}

export function apiUrl(path) {
  const base = getApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
