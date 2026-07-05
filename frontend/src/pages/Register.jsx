import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await register(email.trim(), password, birthdate);
      toast.success("¡Bienvenide a PlanSobrio!");
      nav("/onboarding");
    } catch (ex) {
      const msg = formatApiError(ex.response?.data?.detail) || ex.message;
      setErr(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0E0F13] text-white">
      <div className="mx-auto max-w-md px-6 pt-14 pb-10">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-2xl ps-gradient flex items-center justify-center"><Sparkles size={18}/></div>
          <span className="font-display text-lg font-black">PlanSobrio</span>
        </Link>
        <h1 className="font-display text-4xl font-black tracking-tight">Crea tu cuenta</h1>
        <p className="mt-2 text-white/60">Empieza gratis. Solo mayores de 18 años.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <input data-testid="register-email" type="email" required autoComplete="email" className="ps-input" placeholder="tu correo" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input data-testid="register-password" type="password" required autoComplete="new-password" minLength={6} className="ps-input" placeholder="contraseña (mín. 6)" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <div>
            <label className="text-sm text-white/60 mb-2 block">Fecha de nacimiento</label>
            <input data-testid="register-birthdate" type="date" required className="ps-input" value={birthdate} onChange={(e)=>setBirthdate(e.target.value)} max={new Date(Date.now()-18*365.25*86400000).toISOString().slice(0,10)} />
          </div>
          {err && <p data-testid="register-error" className="text-sm text-[#FF6B5E]">{err}</p>}
          <button data-testid="register-submit" disabled={loading} className="ps-btn-primary w-full">
            {loading ? "Creando…" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-xs text-white/40 leading-relaxed">
          Al continuar aceptas nuestras reglas de comunidad. PlanSobrio no reemplaza tratamiento profesional ni atención de urgencia.
        </p>
        <p className="mt-6 text-center text-sm text-white/60">
          ¿Ya tienes cuenta? <Link to="/login" className="text-white font-semibold underline decoration-[#FF6B5E]">Entra</Link>
        </p>
      </div>
    </div>
  );
}
