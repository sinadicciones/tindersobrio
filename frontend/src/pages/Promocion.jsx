import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Heart, Smile, Users, Compass, MessageCircle, CalendarHeart,
  Sprout, ArrowRight, Share2, Copy, Check, Sparkles,
  ShieldCheck, HandHeart, MapPin, Send, Mail, Linkedin, MessageSquare,
} from "lucide-react";

const SHARE_URL = "https://plansobrio.com/promocion";
const SHARE_TITLE = "PlanSobrio";
const SHARE_TEXT =
  "Descubre PlanSobrio 🌱 — la comunidad para conectar con personas que viven planes sanos, sin que el alcohol ni las drogas sean el foco. Únete:";
const enc = (s) => encodeURIComponent(s);

function useShare() {
  const [copied, setCopied] = useState(false);

  const openWin = (url) => window.open(url, "_blank", "noopener,noreferrer");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
      setCopied(true);
      toast.success("Enlace copiado — compártelo con quien quieras");
      setTimeout(() => setCopied(false), 2500);
    } catch { toast.error("No se pudo copiar el enlace"); }
  };

  const native = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: SHARE_URL }); return; }
      catch { /* user cancelled */ }
    }
    copy();
  };

  const whatsapp = () => openWin(`https://api.whatsapp.com/send?text=${enc(SHARE_TEXT + " " + SHARE_URL)}`);
  const twitter = () => openWin(`https://twitter.com/intent/tweet?text=${enc(SHARE_TEXT)}&url=${enc(SHARE_URL)}`);
  const facebook = () => openWin(`https://www.facebook.com/sharer/sharer.php?u=${enc(SHARE_URL)}&quote=${enc(SHARE_TEXT)}`);
  const telegram = () => openWin(`https://t.me/share/url?url=${enc(SHARE_URL)}&text=${enc(SHARE_TEXT)}`);
  const linkedin = () => openWin(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(SHARE_URL)}`);
  const reddit = () => openWin(`https://www.reddit.com/submit?url=${enc(SHARE_URL)}&title=${enc("PlanSobrio — comunidad para conectar sin alcohol ni drogas")}`);
  const email = () => openWin(`mailto:?subject=${enc("Descubre PlanSobrio")}&body=${enc(SHARE_TEXT + "\n\n" + SHARE_URL)}`);
  const sms = () => openWin(`sms:?&body=${enc(SHARE_TEXT + " " + SHARE_URL)}`);

  return { native, copy, whatsapp, twitter, facebook, telegram, linkedin, reddit, email, sms, copied };
}

export default function Promocion() {
  const s = useShare();

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-sans overflow-x-hidden" data-testid="promo-page">
      {/* Ambient glow orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
             style={{ background: "radial-gradient(closest-side, #FF6B5E, transparent 70%)" }} />
        <div className="absolute top-1/2 -right-32 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl"
             style={{ background: "radial-gradient(closest-side, #8B5CF6, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/4 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
             style={{ background: "radial-gradient(closest-side, #4ADE80, transparent 70%)" }} />
      </div>

      {/* Nav */}
      <nav className="mx-auto max-w-6xl px-5 sm:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" data-testid="promo-logo">
          <div className="w-10 h-10 rounded-2xl ps-gradient flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sprout size={20} className="text-white" strokeWidth={2}/>
          </div>
          <span className="font-display text-xl font-black tracking-tight">PlanSobrio</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={s.native}
            data-testid="promo-nav-share"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 transition"
          >
            <Share2 size={15} strokeWidth={2}/> Compartir
          </button>
          <Link
            to="/registro"
            data-testid="promo-nav-cta"
            className="inline-flex items-center gap-1.5 rounded-full ps-gradient text-white px-4 py-2 text-sm font-bold shadow-md shadow-purple-500/30 hover:opacity-95 transition"
          >
            Abrir la app <ArrowRight size={15} strokeWidth={2.4}/>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-6xl px-5 sm:px-8 pt-10 sm:pt-16 pb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 backdrop-blur px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600" data-testid="promo-hero-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]"/> Comunidad de conexión sana · Beta abierta
        </div>
        <h1
          data-testid="promo-hero-title"
          className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.02] tracking-tight max-w-4xl"
        >
          Conecta con personas que viven <span className="ps-gradient-text">planes sanos</span>,<br className="hidden sm:block"/> sin alcohol ni drogas de por medio.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed" data-testid="promo-hero-sub">
          Match por <b className="text-slate-900">plan</b>, no por foto. Chatea, propón un café, un cerro, un cine o suma un grupo.
          Ya sea que estés en <b className="text-slate-900">recuperación</b> o simplemente elijas la <b className="text-slate-900">conexión sana</b>, PlanSobrio es tu lugar.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/registro"
            data-testid="promo-hero-cta"
            className="inline-flex items-center gap-2 rounded-full ps-gradient text-white px-6 py-3.5 text-[15px] font-bold shadow-xl shadow-purple-500/30 hover:opacity-95 transition"
          >
            Únete gratis <ArrowRight size={17} strokeWidth={2.4}/>
          </Link>
          <a
            href="#compartir"
            data-testid="promo-hero-share"
            className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-6 py-3 text-[15px] font-bold hover:bg-slate-900 hover:text-white transition"
          >
            <Share2 size={16} strokeWidth={2.2}/> Compartir con alguien
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500 flex items-center gap-2" data-testid="promo-hero-note">
          <ShieldCheck size={13} strokeWidth={2} className="text-[#4ADE80]"/> +18 · Perfiles verificados · Reglas claras de convivencia
        </p>
      </header>

      {/* Modos */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500" data-testid="promo-modos-lab">Cuatro maneras de conectar</p>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight">Elige cómo quieres vincularte.</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: HandHeart, title: "Apoyo", desc: "Encuentra a alguien que entiende tu proceso. Escuchar y ser escuchado, sin juicios.", grad: "from-rose-100 to-white", accent: "#FF6B5E" },
            { icon: Smile, title: "Amistad", desc: "Amistades reales que se construyen con planes reales: caminatas, ferias, cines, conversaciones.", grad: "from-amber-50 to-white", accent: "#F59E0B" },
            { icon: Heart, title: "Amor", desc: "Vínculos románticos donde el foco es la persona, no la copa. Match por afinidad de planes.", grad: "from-fuchsia-100 to-white", accent: "#8B5CF6" },
            { icon: Users, title: "Grupos", desc: "Únete a comunidades temáticas — café, deporte, cordillera, arte — con eventos reales.", grad: "from-emerald-50 to-white", accent: "#4ADE80" },
          ].map((m, i) => (
            <div
              key={m.title}
              data-testid={`promo-modo-${m.title.toLowerCase()}`}
              className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br ${m.grad} p-6 hover:border-slate-300 hover:-translate-y-0.5 transition`}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: m.accent + "20", color: m.accent }}>
                <m.icon size={22} strokeWidth={2}/>
              </div>
              <h3 className="mt-4 font-display text-xl font-black">{m.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{m.desc}</p>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: m.accent }}/>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Cómo funciona</p>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight">
          Match por <span className="ps-gradient-text">plan</span>, no por foto.
        </h2>
        <p className="mt-3 text-slate-600 max-w-2xl">Un modelo pensado desde cero para conectar en sobriedad. Menos scroll, más vida real.</p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { n: "01", icon: Sprout, title: "Regístrate", desc: "Cuéntanos tu alias, tus panoramas favoritos y tu relación con las sustancias — o si simplemente eliges la sobriedad." },
            { n: "02", icon: Compass, title: "Descubre por afinidad", desc: "Desliza perfiles con planes en común. Si te gusta, propón un café, una caminata o solo chatear online." },
            { n: "03", icon: CalendarHeart, title: "Conéctate en la vida real", desc: "Chatea, acuerda un panorama y únete a grupos con eventos abiertos en tu ciudad." },
          ].map((step) => (
            <div key={step.n} data-testid={`promo-paso-${step.n}`} className="rounded-3xl border border-slate-200 bg-white p-6 hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-400 tracking-widest">{step.n}</span>
                <div className="w-10 h-10 rounded-full ps-gradient flex items-center justify-center text-white">
                  <step.icon size={18} strokeWidth={2}/>
                </div>
              </div>
              <h3 className="mt-4 font-display text-lg font-black">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Para quién es */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14">
        <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Para quién es</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight" data-testid="promo-para-quien">
                Cualquier persona que <span className="ps-gradient-text">quiera conectar sano</span>.
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">
                No importa dónde estés en el camino. PlanSobrio es tuyo si te identificas con alguna de estas realidades:
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Estás en proceso de recuperación y quieres vincularte con personas que entienden.",
                  "Vives sin alcohol ni drogas desde hace tiempo y buscas pares.",
                  "Nunca tuviste problemas con dependencias — simplemente prefieres planes sanos.",
                  "Quieres unirte a una comunidad amable, sin ambientes de fiesta.",
                ].map((li) => (
                  <li key={li} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#4ADE8020", color: "#16A34A" }}>
                      <Check size={12} strokeWidth={3}/>
                    </span>
                    <span className="text-sm text-slate-700 leading-relaxed">{li}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: MessageCircle, label: "Chatear online", desc: "Sin presión, empieza suave." },
                { icon: MapPin, label: "Grupos por zona", desc: "Encuéntralos cerca." },
                { icon: Sparkles, label: "Planes reales", desc: "Café, cerro, cine, feria." },
                { icon: ShieldCheck, label: "Comunidad segura", desc: "Reglas claras y reportes." },
              ].map((c) => (
                <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:-translate-y-0.5 transition" data-testid={`promo-feature-${c.label.split(" ")[0].toLowerCase()}`}>
                  <c.icon size={18} strokeWidth={2} className="text-[#8B5CF6]"/>
                  <p className="mt-2 font-display font-black text-[15px] leading-tight">{c.label}</p>
                  <p className="mt-1 text-[12px] text-slate-500">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Compartir */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14 scroll-mt-16" id="compartir">
        <div className="rounded-[32px] ps-gradient p-8 sm:p-12 text-white shadow-2xl shadow-purple-500/25">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-80">Ayúdanos a crecer</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight max-w-2xl" data-testid="promo-share-title">
              Alguien que conoces necesita saber que existimos.
            </h2>
            <p className="mt-3 opacity-90 leading-relaxed max-w-2xl">
              Comparte PlanSobrio directamente en tu red favorita. Cada persona que llega, hace la comunidad más fuerte.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {[
              { key: "whatsapp", label: "WhatsApp", onClick: s.whatsapp, bg: "#25D366", char: "W" },
              { key: "telegram", label: "Telegram", onClick: s.telegram, bg: "#26A5E4", icon: Send },
              { key: "x", label: "X · Twitter", onClick: s.twitter, bg: "#000000", char: "𝕏" },
              { key: "facebook", label: "Facebook", onClick: s.facebook, bg: "#1877F2", char: "f" },
              { key: "linkedin", label: "LinkedIn", onClick: s.linkedin, bg: "#0A66C2", icon: Linkedin },
              { key: "reddit", label: "Reddit", onClick: s.reddit, bg: "#FF4500", char: "r" },
              { key: "email", label: "Correo", onClick: s.email, bg: "#0F172A", icon: Mail },
              { key: "sms", label: "SMS", onClick: s.sms, bg: "#334155", icon: MessageSquare },
            ].map((r) => (
              <button
                key={r.key}
                onClick={r.onClick}
                data-testid={`promo-share-${r.key}`}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-white text-[#0F172A] p-4 font-bold text-[13px] hover:-translate-y-0.5 transition shadow-md"
              >
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-sm"
                  style={{ background: r.bg }}
                >
                  {r.icon ? <r.icon size={20} strokeWidth={2}/> : r.char}
                </span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={s.native}
              data-testid="promo-share-native"
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/15 backdrop-blur border border-white/30 text-white px-5 py-3.5 font-bold text-[14px] hover:bg-white/20 transition"
            >
              <Share2 size={17} strokeWidth={2.2}/> Más opciones del sistema
            </button>
            <button
              onClick={s.copy}
              data-testid="promo-share-copy"
              className="flex items-center justify-center gap-2 rounded-2xl bg-white text-[#0F172A] px-5 py-3.5 font-bold text-[14px] hover:bg-slate-50 transition"
            >
              {s.copied ? <Check size={17} strokeWidth={2.4}/> : <Copy size={17} strokeWidth={2.2}/>}
              {s.copied ? "¡Enlace copiado!" : "Copiar enlace"}
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
            Empieza <span className="ps-gradient-text">hoy</span>.<br/>Es gratis y toma 2 minutos.
          </h2>
          <p className="mt-4 text-slate-600 text-lg">Tu próximo café con alguien que se va a acordar de vos, empieza acá.</p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/registro"
              data-testid="promo-final-cta"
              className="inline-flex items-center gap-2 rounded-full ps-gradient text-white px-8 py-4 text-[16px] font-bold shadow-xl shadow-purple-500/30 hover:opacity-95 transition"
            >
              Crear mi cuenta <ArrowRight size={18} strokeWidth={2.4}/>
            </Link>
            <Link
              to="/login"
              data-testid="promo-final-login"
              className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white text-slate-900 px-8 py-[14px] text-[16px] font-bold hover:bg-slate-900 hover:text-white transition"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-5 sm:px-8 py-10 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl ps-gradient flex items-center justify-center">
              <Sprout size={14} className="text-white" strokeWidth={2.2}/>
            </div>
            <span className="font-display font-black text-slate-900">PlanSobrio</span>
            <span className="opacity-70">· hecho con cariño en Chile 🇨🇱</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/terminos" className="hover:text-slate-900 transition">Términos</Link>
            <Link to="/privacidad" className="hover:text-slate-900 transition">Privacidad</Link>
            <a href="mailto:contacto@sinadicciones.org" className="hover:text-slate-900 transition">Contacto</a>
          </div>
        </div>
        <p className="mt-6 text-xs text-slate-400 max-w-3xl">
          PlanSobrio es una comunidad de conexión sana. No reemplaza tratamiento profesional ni atención de urgencia. Si estás en crisis, contacta a <a href="tel:+56224254200" className="underline hover:text-slate-700">Salud Responde 600 360 7777</a>.
        </p>
      </footer>
    </div>
  );
}
