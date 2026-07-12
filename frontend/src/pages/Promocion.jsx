import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Heart, Smile, Users, Compass, MessageCircle, CalendarHeart,
  Sprout, ArrowRight, Share2, Copy, Check, Sparkles,
  ShieldCheck, HandHeart, MapPin, Send, Mail, Linkedin, MessageSquare,
  Lock, Flag, AlertOctagon, ChevronDown, LifeBuoy,
} from "lucide-react";

const SHARE_URL = "https://plansobrio.com/promocion";
const SHARE_TITLE = "PlanSobrio";
const SHARE_TEXT =
  "Descubre PlanSobrio 🌱 — la app para conocer personas sobrias, hacer amigos, encontrar pareja o compartir planes sin alcohol ni drogas. Únete gratis:";
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
      catch { /* cancelled */ }
    }
    copy();
  };
  return {
    native, copy, copied,
    whatsapp: () => openWin(`https://api.whatsapp.com/send?text=${enc(SHARE_TEXT + " " + SHARE_URL)}`),
    twitter: () => openWin(`https://twitter.com/intent/tweet?text=${enc(SHARE_TEXT)}&url=${enc(SHARE_URL)}`),
    facebook: () => openWin(`https://www.facebook.com/sharer/sharer.php?u=${enc(SHARE_URL)}&quote=${enc(SHARE_TEXT)}`),
    telegram: () => openWin(`https://t.me/share/url?url=${enc(SHARE_URL)}&text=${enc(SHARE_TEXT)}`),
    linkedin: () => openWin(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(SHARE_URL)}`),
    reddit: () => openWin(`https://www.reddit.com/submit?url=${enc(SHARE_URL)}&title=${enc("PlanSobrio — comunidad para conocer personas sobrias")}`),
    email: () => openWin(`mailto:?subject=${enc("Descubre PlanSobrio")}&body=${enc(SHARE_TEXT + "\n\n" + SHARE_URL)}`),
    sms: () => openWin(`sms:?&body=${enc(SHARE_TEXT + " " + SHARE_URL)}`),
  };
}

const FAQS = [
  {
    q: "¿PlanSobrio es una app de citas?",
    a: "PlanSobrio es más que una app de citas. Puedes usarla para encontrar pareja, pero también para hacer amigos, recibir apoyo o sumarte a grupos y panoramas. Tú eliges el tipo de vínculo que quieres construir.",
  },
  {
    q: "¿Necesito estar en recuperación para registrarme?",
    a: "No. PlanSobrio está abierto a todas las personas mayores de 18 años que quieran conectar en un entorno sin alcohol ni drogas — ya sea que estés en recuperación, lleves una vida sobria por elección o simplemente prefieras panoramas donde el consumo no sea el foco.",
  },
  {
    q: "¿Puedo usar PlanSobrio solo para hacer amigos?",
    a: "Sí. Al registrarte eliges qué tipo de conexión buscas: apoyo, amistad, amor o grupos. Puedes activar solo amistad y grupos si no quieres citas.",
  },
  {
    q: "¿PlanSobrio es gratis?",
    a: "Sí, registrarte y usar la app es 100% gratis durante la beta. No cobramos por hacer match, chatear ni sumarte a grupos y eventos.",
  },
  {
    q: "¿Cómo se verifican los perfiles?",
    a: "Hoy verificamos el correo electrónico al momento del registro y contamos con moderación de contenido y sistema de reportes. Estamos trabajando en verificación de identidad adicional para las próximas versiones.",
  },
  {
    q: "¿Puedo ocultar mi situación de recuperación?",
    a: "Sí. Tu relación con las sustancias es información privada por defecto. Solo se muestra como insignia si tú activas explícitamente la opción en tu perfil.",
  },
  {
    q: "¿Qué pasa si alguien ofrece alcohol o drogas?",
    a: "Está estrictamente prohibido. Cada perfil, chat y grupo tiene botón de reporte. Las cuentas que promuevan o vendan sustancias son suspendidas sin previo aviso.",
  },
  {
    q: "¿Quién está detrás de PlanSobrio?",
    a: (
      <>
        PlanSobrio nace de <b>Nelson González</b>, fundador de{" "}
        <a href="https://sinadicciones.org" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] font-semibold underline underline-offset-2 hover:text-[#6D28D9]">Sinadicciones.org</a> — una organización chilena dedicada a acompañar procesos de recuperación de adicciones, difundir información y visibilizar historias reales. PlanSobrio es la extensión digital de ese trabajo: llevar la comunidad sobria al espacio donde hoy la mayoría busca conectar.{" "}
        <a href="https://sinadicciones.org" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] font-semibold underline underline-offset-2 hover:text-[#6D28D9]">Conoce Sinadicciones.org →</a>
      </>
    ),
    aText: "PlanSobrio nace de Nelson González, fundador de Sinadicciones.org — una organización chilena dedicada a acompañar procesos de recuperación de adicciones, difundir información y visibilizar historias reales. PlanSobrio es la extensión digital de ese trabajo. Más en https://sinadicciones.org",
  },
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="mx-auto max-w-4xl px-5 sm:px-8 py-14" data-testid="promo-faq">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Preguntas frecuentes</p>
      <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight">
        Lo que <span className="ps-gradient-text">quieres saber</span> antes de entrar.
      </h2>
      <div className="mt-8 space-y-2.5">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={f.q}
              data-testid={`faq-${i}`}
              className={`rounded-2xl border transition ${isOpen ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"}`}
            >
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
                data-testid={`faq-toggle-${i}`}
              >
                <span className="font-display font-black text-[15px] sm:text-base text-slate-900 leading-snug">{f.q}</span>
                <ChevronDown size={18} strokeWidth={2.4} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}/>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed" data-testid={`faq-answer-${i}`}>
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Promocion() {
  const s = useShare();

  // SEO: title, meta description, JSON-LD (SoftwareApplication + FAQPage)
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "PlanSobrio | Conoce personas sobrias, amigos y pareja";
    const setMeta = (name, content, attr = "name") => {
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      const prev = tag.getAttribute("content");
      tag.setAttribute("content", content);
      return () => { if (prev !== null) tag.setAttribute("content", prev); };
    };
    const desc = "Conoce personas sobrias para hacer amigos, encontrar pareja, recibir apoyo y compartir planes sin alcohol ni drogas. Únete gratis a PlanSobrio.";
    const restore = [
      setMeta("description", desc),
      setMeta("og:title", "PlanSobrio | Conoce personas sobrias, amigos y pareja", "property"),
      setMeta("og:description", desc, "property"),
      setMeta("og:url", SHARE_URL, "property"),
      setMeta("twitter:title", "PlanSobrio | Conoce personas sobrias, amigos y pareja"),
      setMeta("twitter:description", desc),
    ];

    // Canonical link (per route)
    let canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical ? canonical.getAttribute("href") : null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", SHARE_URL);

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.setAttribute("data-ld", "promocion");
    ld.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "PlanSobrio",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web, iOS, Android",
        url: "https://plansobrio.com/",
        description: desc,
        offers: { "@type": "Offer", price: "0", priceCurrency: "CLP" },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "PlanSobrio",
        url: "https://plansobrio.com/",
        logo: "https://plansobrio.com/favicon-512.png",
        sameAs: [],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.aText || f.a },
        })),
      },
    ]);
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      restore.forEach((r) => r());
      if (prevCanonical !== null) canonical.setAttribute("href", prevCanonical);
      ld.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-sans overflow-x-hidden" data-testid="promo-page">
      {/* Ambient glow orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(closest-side, #FF6B5E, transparent 70%)" }}/>
        <div className="absolute top-1/2 -right-32 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(closest-side, #8B5CF6, transparent 70%)" }}/>
        <div className="absolute bottom-0 left-1/4 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(closest-side, #4ADE80, transparent 70%)" }}/>
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
            Crear cuenta gratis <ArrowRight size={15} strokeWidth={2.4}/>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-6xl px-5 sm:px-8 pt-10 sm:pt-16 pb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 backdrop-blur px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600" data-testid="promo-hero-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]"/> Beta abierta · Conexión sin alcohol ni drogas
        </div>
        <h1
          data-testid="promo-hero-title"
          className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.02] tracking-tight max-w-4xl"
        >
          Conoce personas para compartir <span className="ps-gradient-text">planes sin alcohol ni drogas</span>.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed" data-testid="promo-hero-sub">
          PlanSobrio es una app para <b className="text-slate-900">hacer amigos, encontrar apoyo, conocer personas sobrias o conectar con alguien especial</b>.
          Haz match por afinidad y panoramas en común: un café, una caminata, el cine, el cerro, una feria o una conversación tranquila.
          Ya sea que estés en recuperación o simplemente prefieras una vida sin alcohol ni drogas, aquí puedes conocer personas que buscan lo mismo.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/registro"
            data-testid="promo-hero-cta"
            className="inline-flex items-center gap-2 rounded-full ps-gradient text-white px-6 py-3.5 text-[15px] font-bold shadow-xl shadow-purple-500/30 hover:opacity-95 transition"
          >
            Crear mi cuenta gratis <ArrowRight size={17} strokeWidth={2.4}/>
          </Link>
          <a
            href="#como-funciona"
            data-testid="promo-hero-secondary"
            className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-6 py-3 text-[15px] font-bold hover:bg-slate-900 hover:text-white transition"
          >
            Conocer cómo funciona
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500 flex items-center gap-2 flex-wrap" data-testid="promo-hero-note">
          <ShieldCheck size={13} strokeWidth={2} className="text-[#4ADE80]"/>
          Solo para mayores de 18 años · Comunidad moderada · Reglas claras de convivencia
        </p>
      </header>

      {/* Intent selector */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14" data-testid="promo-intencion">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Elige tu punto de partida</p>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight">
          ¿Qué buscas hoy?
        </h2>
        <p className="mt-3 text-slate-600 max-w-2xl">No todas las personas llegan buscando lo mismo. Elige el tipo de vínculo que quieres construir — puedes cambiarlo cuando quieras.</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: "apoyo", icon: HandHeart, title: "Alguien con quien hablar", desc: "Encuentra personas que puedan comprender tu proceso. Un espacio para escuchar y ser escuchado, sin juicios.", accent: "#FF6B5E", grad: "from-rose-100 to-white" },
            { key: "amistad", icon: Smile, title: "Nuevas amistades", desc: "Conoce gente para compartir caminatas, cafés, ferias, cine, deporte y conversaciones reales.", accent: "#F59E0B", grad: "from-amber-50 to-white" },
            { key: "amor", icon: Heart, title: "Una relación", desc: "Personas interesadas en construir un vínculo donde importa más la conexión que la copa.", accent: "#8B5CF6", grad: "from-fuchsia-100 to-white" },
            { key: "grupos", icon: Users, title: "Grupos y panoramas", desc: "Únete a comunidades y encuentros de café, deporte, naturaleza, arte y cultura.", accent: "#4ADE80", grad: "from-emerald-50 to-white" },
          ].map((it) => (
            <Link
              key={it.key}
              to={`/registro?intencion=${it.key}`}
              data-testid={`promo-intencion-${it.key}`}
              className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br ${it.grad} p-6 hover:border-slate-300 hover:-translate-y-0.5 transition group`}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: it.accent + "20", color: it.accent }}>
                  <it.icon size={22} strokeWidth={2}/>
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-black">{it.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{it.desc}</p>
                </div>
                <ArrowRight size={18} strokeWidth={2} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition"/>
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: it.accent }}/>
            </Link>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-5 sm:px-8 py-14 scroll-mt-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Cómo funciona PlanSobrio</p>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight">
          Match por plan, <span className="ps-gradient-text">no solo por foto</span>.
        </h2>
        <p className="mt-3 text-slate-600 max-w-2xl">Conecta por las cosas que realmente podrían hacer juntos: tomar un café, subir un cerro, recorrer una feria, ir al cine o conversar online.</p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { n: "01", icon: Sprout, title: "Crea tu perfil", desc: "Cuéntanos qué tipo de conexión buscas, qué panoramas disfrutas y cómo prefieres relacionarte con la comunidad." },
            { n: "02", icon: Compass, title: "Descubre personas afines", desc: "Encuentra personas cercanas con intereses, experiencias y panoramas compatibles." },
            { n: "03", icon: MessageCircle, title: "Conversen y armen un plan", desc: "Chatea con calma, propón un panorama y conéctate de forma segura, a tu ritmo." },
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
                Aquí no tienes que <span className="ps-gradient-text">explicar por qué no tomas</span>.
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">
                PlanSobrio está abierto a todas las personas mayores de 18 años que quieran conectar en un entorno sin alcohol ni drogas.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Estás en proceso de recuperación y quieres vincularte con personas que entienden.",
                  "Vives sin alcohol ni drogas desde hace tiempo y buscas pares.",
                  "Nunca tuviste problemas con dependencias — simplemente prefieres planes sanos.",
                  "Quieres conocer gente sin tener que ir a fiestas ni bares.",
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
                { icon: ShieldCheck, label: "Comunidad moderada", desc: "Reglas claras y reportes." },
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

      {/* Seguridad */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14" data-testid="promo-seguridad">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Comunidad más segura</p>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight">
          Herramientas para <span className="ps-gradient-text">cuidarnos</span> entre todos.
        </h2>
        <p className="mt-3 text-slate-600 max-w-2xl">Ninguna app puede garantizar seguridad absoluta, pero sí podemos entregarte las mejores herramientas para decidir con calma con quién y cuándo conectar.</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: Lock, title: "Información sensible protegida", desc: "Tu relación con las sustancias es privada por defecto. Solo se muestra si tú lo activas." },
            { icon: Flag, title: "Reporte y bloqueo en un clic", desc: "Cada perfil, chat y grupo tiene botones claros de reporte y bloqueo. Revisamos cada caso." },
            { icon: AlertOctagon, title: "Cero tolerancia con sustancias", desc: "Prohibido ofrecer, promover o vender alcohol o drogas. Suspensión inmediata sin previo aviso." },
            { icon: ShieldCheck, title: "Correo verificado al registrarte", desc: "Verificamos correo y estamos trabajando en verificación de identidad para las próximas versiones." },
            { icon: LifeBuoy, title: "Canales de ayuda visibles", desc: "Enlaces a líneas de crisis y recursos profesionales en toda la app. Nunca reemplazamos terapia." },
            { icon: Users, title: "Reglas de convivencia claras", desc: "Sin acoso, sin discriminación, sin discursos de odio. Comunidad amable o no comunidad." },
          ].map((c) => (
            <div key={c.title} data-testid={`seg-${c.title.split(" ")[0].toLowerCase()}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                <c.icon size={18} strokeWidth={2}/>
              </div>
              <p className="mt-3 font-display font-black text-[15px] leading-tight">{c.title}</p>
              <p className="mt-1.5 text-[13px] text-slate-600 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <Faq/>

      {/* Fundador */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14" data-testid="promo-fundador">
        <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-white p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-center">
            <div className="mx-auto lg:mx-0">
              <div className="w-44 h-44 rounded-3xl ps-gradient p-[3px] shadow-2xl shadow-purple-500/20">
                <div className="w-full h-full rounded-[22px] bg-white flex items-center justify-center overflow-hidden">
                  <span className="font-display text-6xl font-black ps-gradient-text">NG</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Detrás del proyecto</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight" data-testid="promo-fundador-title">
                Nelson González — <span className="ps-gradient-text">fundador de PlanSobrio</span>
              </h2>
              <p className="mt-4 text-slate-700 leading-relaxed">
                Persona en recuperación, padre, hijo y hermano. Fundador de{" "}
                <a href="https://sinadicciones.org" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#8B5CF6] underline underline-offset-2 hover:text-[#6D28D9]" data-testid="fundador-sinadicciones-link">
                  Sinadicciones.org
                </a>{" "}
                y autor del libro <em>&ldquo;El principio del mapa inverso&rdquo;</em>. PlanSobrio nace de años acompañando procesos de recuperación en Chile — de la convicción de que <b>los vínculos sanos son el mejor tratamiento de largo plazo</b> y de que la vida sobria merece un espacio propio en internet, más allá de los grupos de ayuda tradicionales.
              </p>
              <p className="mt-3 text-slate-600 leading-relaxed">
                &ldquo;No se trata de la vida que dejaste. Se trata de la vida que puedes construir ahora.&rdquo;
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <a
                  href="https://sinadicciones.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="fundador-cta-org"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-5 py-2.5 text-sm font-bold hover:bg-slate-900 hover:text-white transition"
                >
                  Conocer Sinadicciones.org <ArrowRight size={15} strokeWidth={2.4}/>
                </a>
              </div>
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
              Comparte PlanSobrio directamente en tu red favorita. Cada persona que llega hace la comunidad más fuerte.
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
            Tu próximo café <span className="ps-gradient-text">puede empezar aquí</span>.
          </h2>
          <p className="mt-4 text-slate-600 text-lg">
            Conoce a alguien para conversar, hacer un plan o construir algo nuevo. Sin alcohol, sin drogas y sin tener que dar explicaciones.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/registro"
              data-testid="promo-final-cta"
              className="inline-flex items-center gap-2 rounded-full ps-gradient text-white px-8 py-4 text-[16px] font-bold shadow-xl shadow-purple-500/30 hover:opacity-95 transition"
            >
              Crear mi cuenta gratis <ArrowRight size={18} strokeWidth={2.4}/>
            </Link>
            <Link
              to="/login"
              data-testid="promo-final-login"
              className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white text-slate-900 px-8 py-[14px] text-[16px] font-bold hover:bg-slate-900 hover:text-white transition"
            >
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">Toma menos de 2 minutos. Tú decides qué información compartir.</p>
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
            <span className="opacity-70 inline-flex items-center gap-1">
              · hecho con <Heart size={12} strokeWidth={0} fill="#FF6B5E" className="inline-block"/> desde{" "}
              <a href="https://sinadicciones.org" target="_blank" rel="noopener noreferrer" data-testid="footer-sinadicciones" className="font-semibold text-slate-900 hover:text-[#8B5CF6] transition underline underline-offset-2 decoration-slate-300">
                Sinadicciones.org
              </a>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/terminos" className="hover:text-slate-900 transition">Términos</Link>
            <Link to="/privacidad" className="hover:text-slate-900 transition">Privacidad</Link>
            <a href="mailto:contacto@sinadicciones.org" className="hover:text-slate-900 transition">Contacto</a>
          </div>
        </div>
        <p className="mt-6 text-xs text-slate-400 max-w-3xl">
          PlanSobrio es una comunidad de conexión sana. No reemplaza tratamiento profesional ni atención de urgencia. Si estás en crisis, contacta a <a href="tel:6003607777" className="underline hover:text-slate-700">Salud Responde 600 360 7777</a>.
        </p>
      </footer>
    </div>
  );
}
