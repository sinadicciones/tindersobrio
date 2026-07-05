import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { API } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
// This component processes the `#session_id=` fragment left by Emergent Google Auth.
// It exchanges it with our backend for a JWT, stores it, and navigates to the app.
export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;
    // Clean the fragment immediately so a refresh doesn't retry
    try { window.history.replaceState(null, "", window.location.pathname + window.location.search); } catch { /* ignore */ }

    if (!sessionId) {
      toast.error("No pudimos completar el inicio de sesión con Google");
      nav("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API}/auth/google/session`, {
          method: "POST",
          headers: { "X-Session-ID": sessionId },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const detail = body.detail || "";
          if (typeof detail === "string" && detail.startsWith("account_banned")) {
            nav("/cuenta-suspendida?kind=banned", { replace: true });
            return;
          }
          if (typeof detail === "string" && detail.startsWith("account_suspended")) {
            const prefix = "account_suspended:";
            const until = detail.startsWith(prefix) ? detail.slice(prefix.length) : "";
            nav(`/cuenta-suspendida?kind=suspended&until=${encodeURIComponent(until)}`, { replace: true });
            return;
          }
          throw new Error(detail || "auth-failed");
        }
        const data = await res.json();
        localStorage.setItem("ps_token", data.token);
        setUser(data.user);
        toast.success("¡Bienvenide!");
        const u = data.user || {};
        if (u.role === "admin") nav("/admin", { replace: true });
        else if (!u.onboarding_complete) nav("/onboarding", { replace: true });
        else nav("/app/descubrir", { replace: true });
      } catch (ex) {
        toast.error("No pudimos completar el inicio de sesión con Google");
        nav("/login", { replace: true });
      }
    })();
  }, [nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E0F13]">
      <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-[#FF6B5E] animate-spin"/>
    </div>
  );
}
