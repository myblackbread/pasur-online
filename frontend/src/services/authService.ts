export interface AuthSession {
  token: string;
  userId: string;
  isAnonymous: boolean;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export const authService = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  },

  setToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },

  async getCurrentUser(): Promise<AuthSession | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        this.setToken(null);
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  },

  async signInWithEmail(email: string, pass: string): Promise<AuthSession> {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: pass }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Ошибка входа');
    }

    const data: AuthSession = await res.json();
    this.setToken(data.token);
    return data;
  },

  async signUpWithEmail(email: string, pass: string, name?: string): Promise<AuthSession> {
    const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: pass, displayName: name?.trim() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Ошибка регистрации');
    }

    const data: AuthSession = await res.json();
    this.setToken(data.token);
    return data;
  },

  async signInAnonymously(): Promise<AuthSession> {
    const res = await fetch(`${BACKEND_URL}/api/auth/guest`, {
      method: 'POST',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Ошибка гостевого входа');
    }

    const data: AuthSession = await res.json();
    this.setToken(data.token);
    return data;
  },

  async signOut(): Promise<void> {
    this.setToken(null);
  },
};