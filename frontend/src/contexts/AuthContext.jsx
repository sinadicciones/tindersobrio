import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined=loading, null=guest, obj=user
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // If we're returning from Emergent Google Auth, let AuthCallback handle it.
    // It will set the JWT and reload; we skip the /auth/me probe to avoid a race.
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("ps_token");
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (ex) {
      const detail = ex.response?.data?.detail;
      localStorage.removeItem("ps_token");
      setUser(null);
      // Redirect to friendly suspended screen if that was the reason
      if (typeof detail === "string" && detail.startsWith("account_banned")) {
        window.location.replace("/cuenta-suspendida?kind=banned");
        return;
      }
      if (typeof detail === "string" && detail.startsWith("account_suspended")) {
        const prefix = "account_suspended:";
        const until = detail.startsWith(prefix) ? detail.slice(prefix.length) : "";
        window.location.replace(`/cuenta-suspendida?kind=suspended&until=${encodeURIComponent(until)}`);
        return;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("ps_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, birthdate) => {
    const { data } = await api.post("/auth/register", { email, password, birthdate });
    localStorage.setItem("ps_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_e) { /* ignore */ }
    localStorage.removeItem("ps_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
