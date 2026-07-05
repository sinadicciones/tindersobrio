import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";

export default function CuentaSuspendida() {
  const loc = useLocation();
  const nav = useNavigate();
  const params = new URLSearchParams(loc.search);
  const kind = params.get("kind") || "suspended"; // 'suspended' | 'banned'
  const until = params.get("until") || "";

  const isBanned = kind === "banned";
  const title = isBanned ? "Tu cuenta fue suspendida" : "Tu cuenta está temporalmente pausada";
  const desc = isBanned
    ? "Detectamos incumplimientos serios de las reglas de la comunidad. Por eso tu cuenta fue suspendida de manera indefinida."
    : `Tu cuenta está pausada${until ? ` hasta el ${new Date(until).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}` : " por incumplir las reglas de la comunidad"}. Podrás volver a entrar después de esa fecha.`;

  return (
    <div className="min-h-screen bg-[#0E0F13] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button onClick={()=>nav("/")} data-testid="back-home" className="flex items-center gap-1 text-white/60 mb-6 hover:text-white/90">
          <ArrowLeft size={18}/> Volver
        </button>
        <div className="ps-card p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(255,107,94,0.15)", border: "1px solid rgba(255,107,94,0.4)" }}>
            <span className="text-4xl">💛</span>
          </div>
          <h1 data-testid="suspended-title" className="font-display text-2xl font-black tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-white/70 leading-relaxed">{desc}</p>
          <p className="mt-4 text-sm text-white/80">
            Cuidamos que PlanSobrio sea un espacio seguro para todes. Si crees que esto es un error o quieres apelar, puedes escribirnos.
          </p>
          <a data-testid="contact-support" href="mailto:contacto@sinadicciones.org" className="ps-btn-primary mt-6 inline-flex items-center gap-2">
            <Mail size={16}/> Escribir al soporte
          </a>
          <div className="mt-5 text-xs text-white/40">
            <Link to="/terminos" className="underline hover:text-white/60">Reglas de la comunidad</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
