const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

/** Read the CSRF cookie issued by the server (double-submit pattern). */
function readCookie(name) {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1] ?? null;
}

/**
 * Single entry point for API calls.
 * Always sends the session cookie and echoes the CSRF token, so the backend
 * can authenticate + authorise the request. This is a security control, not UX:
 * without these headers every admin call is rejected with 401/403.
 */
export async function apiFetch(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const verb = method.toUpperCase();
  const finalHeaders = { 'Content-Type': 'application/json', ...headers };

  if (!['GET', 'HEAD', 'OPTIONS'].includes(verb)) {
    const csrf = readCookie('csrf_token');
    if (csrf) finalHeaders['x-csrf-token'] = csrf;
  }

  const res = await fetch(apiUrl(path), {
    method: verb,
    credentials: 'include',
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal
  });

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: 'Server javobi noto\'g\'ri formatda.' }; }

  if (!res.ok) {
    const err = new Error(data?.error || `So\'rov muvaffaqiyatsiz (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
