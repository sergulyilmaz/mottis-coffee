const API_BASE = '/api';

function getTokens() {
  return {
    access: localStorage.getItem('accessToken'),
    refresh: localStorage.getItem('refreshToken'),
  };
}

async function request(path, options = {}) {
  const { access } = getTokens();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (access) headers['Authorization'] = `Bearer ${access}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!retry.ok) throw await retry.json();
      return retry.json();
    }
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Oturum süresi doldu');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Sunucu hatası' }));
    throw err;
  }

  return res.json();
}

async function tryRefresh() {
  const { refresh } = getTokens();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/staff/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('accessToken', data.accessToken);
    return true;
  } catch {
    return false;
  }
}

const api = {
  get:    (path)       => request(path),
  post:   (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path)       => request(path, { method: 'DELETE' }),

  login: async (identifier, password) => {
    const res = await fetch(`${API_BASE}/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Giriş başarısız' }));
      throw err;
    }
    const data = await res.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('staff', JSON.stringify(data.staff));
    return data;
  },

  logout: () => {
    localStorage.clear();
    window.location.href = '/login';
  },
};

export default api;
