import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { COUNTRY_CODES } from "@/constants/countries";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const routerLoc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Same URL-param capture as Register.jsx — some users click a landing link
  // then go to /login (already registered from a previous device). Preserve
  // the ?pais / UTM in case they later create a new account here.
  useEffect(() => {
    const params = new URLSearchParams(routerLoc.search);
    const pais = (params.get("pais") || "").toUpperCase().trim();
    const acquisition = {
      pais: pais && COUNTRY_CODES.includes(pais) ? pais : undefined,
      utm_source:   params.get("utm_source")   || undefined,
      utm_medium:   params.get("utm_medium")   || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_content:  params.get("utm_content")  || undefined,
    };
    if (Object.values(acquisition).some(Boolean)) {
      try { localStorage.setItem("ps_acquisition", JSON.stringify(acquisition)); } catch (_e) { /* ignore */ }
    }
  }, [routerLoc.search]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const u = await login(email.trim(), password);
      toast.success("¡Bienvenide de vuelta!");
      if (u.role === "admin") nav("/admin");
      else if (!u.onboarding_complete) nav("/onboarding");
      else nav("/app/descubrir");
    } catch (ex) {
      const detail = ex.response?.data?.detail;
      if (typeof detail === "string" && detail.startsWith("account_banned")) {
        nav("/cuenta-suspendida?kind=banned");
        return;
      }
      if (typeof detail === "string" && detail.startsWith("account_suspended")) {
        const prefix = "account_suspended:";
        const until = detail.startsWith(prefix) ? detail.slice(prefix.length) : "";
        nav(`/cuenta-suspendida?kind=suspended&until=${encodeURIComponent(until)}`);
        return;
      }
      setErr(formatApiError(detail) || ex.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0E0F13] text-white">
      <div className="mx-auto max-w-md px-6 pt-14 pb-10">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-2xl ps-gradient flex items-center justify-center"><Sparkles size={18}/></div>
          <span className="font-display text-lg font-black">PlanSobrio</span>
        </Link>
        <h1 className="font-display text-4xl font-black tracking-tight">Hola de nuevo</h1>
        <p className="mt-2 text-white/60">Ingresa a seguir armando panoramas.</p>

        <div className="mt-8">
          <GoogleAuthButton label="Entrar con Google"/>
          <div className="flex items-center gap-3 my-5 text-xs text-white/40">
            <span className="flex-1 h-px bg-white/10"/> o con tu correo <span className="flex-1 h-px bg-white/10"/>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input data-testid="login-email" type="email" required autoComplete="email" className="ps-input" placeholder="tu correo" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input data-testid="login-password" type="password" required autoComplete="current-password" className="ps-input" placeholder="contraseña" value={password} onChange={(e)=>setPassword(e.target.value)} />
          {err && <p data-testid="login-error" className="text-sm text-[#FF6B5E]">{err}</p>}
          <button data-testid="login-submit" disabled={loading} className="ps-btn-primary w-full">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-white/60">
          <Link data-testid="forgot-link" to="/olvide-contrasena" className="text-white/80 hover:text-white underline">Olvidé mi contraseña</Link>
        </p>

        <p className="mt-8 text-center text-sm text-white/60">
          ¿No tienes cuenta? <Link to="/registro" className="text-white font-semibold underline decoration-[#FF6B5E]">Crea una</Link>
        </p>
      </div>
    </div>
  );
}
