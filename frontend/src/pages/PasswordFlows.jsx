import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, ArrowLeft } from "lucide-react";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "No pudimos enviar el correo");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0E0F13] text-white">
      <div className="mx-auto max-w-md px-6 pt-14 pb-10">
        <Link to="/login" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-8">
          <ArrowLeft size={14}/> Volver al ingreso
        </Link>
        <div className="w-9 h-9 rounded-2xl ps-gradient flex items-center justify-center mb-6"><Sparkles size={18}/></div>
        <h1 className="font-display text-4xl font-black tracking-tight">Restablecer contraseña</h1>
        <p className="mt-2 text-white/60">Te enviaremos un link para crear una contraseña nueva.</p>

        {sent ? (
          <div data-testid="forgot-sent" className="mt-8 ps-card p-5">
            <p className="text-white">Si esa cuenta existe, ya te enviamos un correo. Revisa tu bandeja (y spam por si acaso).</p>
            <Link to="/login" className="mt-4 ps-btn-primary w-full inline-flex justify-center">Volver al login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <input data-testid="forgot-email" type="email" required className="ps-input" placeholder="tu correo" value={email} onChange={(e)=>setEmail(e.target.value)}/>
            <button data-testid="forgot-submit" disabled={loading} className="ps-btn-primary w-full">
              {loading ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 6) { toast.error("Al menos 6 caracteres"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      toast.success("Contraseña restablecida. Ahora inicia sesión.");
      nav("/login");
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "Link inválido o expirado");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0E0F13] text-white">
      <div className="mx-auto max-w-md px-6 pt-14 pb-10">
        <div className="w-9 h-9 rounded-2xl ps-gradient flex items-center justify-center mb-6"><Sparkles size={18}/></div>
        <h1 className="font-display text-4xl font-black tracking-tight">Nueva contraseña</h1>
        <p className="mt-2 text-white/60">Ingresa una contraseña nueva (mínimo 6 caracteres).</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input data-testid="reset-password" type="password" required minLength={6} className="ps-input" placeholder="nueva contraseña" value={pw} onChange={(e)=>setPw(e.target.value)}/>
          <button data-testid="reset-submit" disabled={loading || !token} className="ps-btn-primary w-full">
            {loading ? "Guardando…" : "Guardar y entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
