import { Link } from "react-router-dom";
import { Sparkles, Heart, Users, HandHeart } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0E0F13] text-white relative overflow-hidden">
      {/* background glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(circle, #FF6B5E 0%, transparent 60%)" }} />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 60%)" }} />

      <div className="mx-auto max-w-md px-6 pt-14 pb-10 relative z-10">
        <div className="flex items-center gap-2 mb-14">
          <div className="w-10 h-10 rounded-2xl ps-gradient flex items-center justify-center">
            <Sparkles size={22} className="text-white" />
          </div>
          <span className="font-display text-xl font-black tracking-tight">PlanSobrio</span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="font-display text-5xl sm:text-6xl font-black leading-[1.02] tracking-tight"
        >
          Conoce gente<br />que <span className="ps-gradient-text">vive sin</span><br />alcohol ni drogas.
        </motion.h1>

        <p className="mt-6 text-white/60 text-lg leading-relaxed">
          Amor, amistad, apoyo y grupos. Todo con un solo plan: juntarse a hacer algo bacán, sin copete.
        </p>

        <div className="mt-8 space-y-3">
          <Link to="/registro" data-testid="landing-register-btn" className="ps-btn-primary block text-center text-base">
            Crear cuenta gratis
          </Link>
          <Link to="/login" data-testid="landing-login-btn" className="ps-btn-secondary block text-center text-base">
            Ya tengo cuenta
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3">
          {[
            { icon: HandHeart, l: "Apoyo", c: "#38BDF8" },
            { icon: Users, l: "Amistad", c: "#FBBF24" },
            { icon: Heart, l: "Amor", c: "#FF6B5E" },
            { icon: Sparkles, l: "Grupos", c: "#8B5CF6" },
          ].map((it, i) => (
            <motion.div
              key={it.l}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="ps-card p-5"
            >
              <it.icon size={22} style={{ color: it.c }} />
              <p className="mt-3 font-display font-bold text-lg">{it.l}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-14 text-center text-xs text-white/40 leading-relaxed">
          Solo para mayores de 18 años. PlanSobrio no reemplaza tratamiento profesional ni atención de urgencia.
        </p>
        <div className="mt-4 text-center text-xs text-white/40 space-x-3">
          <Link to="/terminos" data-testid="footer-terms" className="hover:text-white/70 underline decoration-transparent hover:decoration-current transition">Términos</Link>
          <span className="opacity-30">·</span>
          <Link to="/privacidad" data-testid="footer-privacy" className="hover:text-white/70 underline decoration-transparent hover:decoration-current transition">Privacidad</Link>
        </div>
      </div>
    </div>
  );
}
