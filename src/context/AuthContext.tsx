import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AppUser {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatar: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, handle: string, email: string, password: string) => Promise<string | null>;
  logout: () => void;
  updateUser: (u: Partial<AppUser>) => void;
}

const AUTH_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

const AuthContext = createContext<AuthContextType | null>(null);

const parseBody = (raw: unknown) => {
  if (typeof raw === "string") return JSON.parse(raw);
  if (raw && typeof (raw as { body?: unknown }).body === "string") return JSON.parse((raw as { body: string }).body);
  return raw;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("auth_token");
    if (!saved) { setLoading(false); return; }
    fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "me", token: saved }),
    })
      .then(r => r.json())
      .then(raw => {
        const data = parseBody(raw);
        if (data.user) { setUser(data.user); setToken(saved); }
        else localStorage.removeItem("auth_token");
      })
      .catch(() => localStorage.removeItem("auth_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });
    const raw = await res.json();
    const data = parseBody(raw);
    if (data.error) return data.error;
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("user_id", data.user.id);
    return null;
  };

  const register = async (name: string, handle: string, email: string, password: string): Promise<string | null> => {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", name, handle, email, password }),
    });
    const raw = await res.json();
    const data = parseBody(raw);
    if (data.error) return data.error;
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("user_id", data.user.id);
    return null;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
  };

  const updateUser = (u: Partial<AppUser>) => {
    setUser(prev => prev ? { ...prev, ...u } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
