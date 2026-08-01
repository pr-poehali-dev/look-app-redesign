import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ProfileLink = string | { url: string; label?: string };

export interface AppUser {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatar: string | null;
  phone?: string | null;
  gender?: string | null;
  links?: ProfileLink[];
}

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, handle: string, email: string, password: string, phone: string) => Promise<string | null>;
  loginWithSession: (user: AppUser, token: string) => void;
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

const readCachedUser = (): AppUser | null => {
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch { return null; }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const savedToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const cachedUser = savedToken ? readCachedUser() : null;
  const [user, setUser] = useState<AppUser | null>(cachedUser);
  const [token, setToken] = useState<string | null>(cachedUser ? savedToken : null);
  // Показываем интерфейс сразу, если есть кэш профиля — проверка идёт в фоне
  const [loading, setLoading] = useState(!!savedToken && !cachedUser);

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
        if (data.user) {
          setUser(data.user);
          setToken(saved);
          localStorage.setItem("auth_user", JSON.stringify(data.user));
          localStorage.setItem("user_id", data.user.id);
          if (data.user.handle) localStorage.setItem("user_handle", data.user.handle);
        }
        else { setUser(null); setToken(null); localStorage.removeItem("auth_token"); localStorage.removeItem("auth_user"); }
      })
      .catch(() => { /* оффлайн/медленный сервер — оставляем кэшированный вход */ })
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
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    localStorage.setItem("user_id", data.user.id);
    if (data.user.handle) localStorage.setItem("user_handle", data.user.handle);
    return null;
  };

  const register = async (name: string, handle: string, email: string, password: string, phone: string): Promise<string | null> => {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", name, handle, email, password, phone, origin: window.location.origin }),
    });
    const raw = await res.json();
    const data = parseBody(raw);
    if (data.error) return data.error;
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    localStorage.setItem("user_id", data.user.id);
    if (data.user.handle) localStorage.setItem("user_handle", data.user.handle);
    return null;
  };

  const loginWithSession = (newUser: AppUser, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    localStorage.setItem("user_id", newUser.id);
    if (newUser.handle) localStorage.setItem("user_handle", newUser.handle);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_handle");
  };

  const updateUser = (u: Partial<AppUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...u };
      localStorage.setItem("auth_user", JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithSession, logout, updateUser }}>
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