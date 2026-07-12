import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Sprout, ArrowRight, MapPin, HandHeart, Users, ShieldCheck, Sparkles,
  Coffee, Dumbbell, Leaf, Landmark, Palette, BookOpen, PartyPopper, Trees,
  Send, CheckCircle2, Heart,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { COMUNAS_RM } from "@/constants/comunas";

const PAGE_URL = "https://plansobrio.com/convenios";
const PAGE_TITLE = "Suma tu lugar — PlanSobrio para aliados";
const PAGE_DESC =
  "Suma tu café, gimnasio, centro cultural o espacio a la red PlanSobrio y conecta con un público chileno que vive sin alcohol y busca dónde ir.";

const OFFER_TYPES = [
  { v: "cafe_restaurante_saludable", l: "Café / Restaurante saludable", icon: Coffee },
  { v: "gimnasio_deporte", l: "Gimnasio o centro deportivo", icon: Dumbbell },
  { v: "yoga_meditacion_wellness", l: "Yoga, meditación o wellness", icon: Leaf },
  { v: "cultura_museo_teatro", l: "Centro cultural, museo o teatro", icon: Landmark },
  { v: "taller_academia", l: "Taller o academia (arte, cocina…)", icon: Palette },
  { v: "cafe_libreria", l: "Café / Librería", icon: BookOpen },
  { v: "espacio_eventos", l: "Espacio para eventos", icon: PartyPopper },
  { v: "aire_libre", l: "Panorama al aire libre (tour, parque, aventura)", icon: Trees },
  { v: "otro", l: "Otro", icon: Sparkles },
];

const BENEFITS = [
  {
    icon: Users,
    title: "Un público difícil de alcanzar",
    text: "Personas que viven sin alcohol o prefieren no tomar, y buscan panoramas de día en su comuna.",
  },
  {
    icon: MapPin,
    title: "Apareces en el mapa de planes",
    text: "Tu lugar se muestra en la app filtrado por comuna, para que la comunidad te descubra al tiro.",
  },
  {
    icon: ShieldCheck,
    title: "Sello «Lugar PlanSobrio»",
    text: "Un Score Sobrio y sello de confianza que muestra que tu espacio recibe bien a quien no toma.",
  },
  {
    icon: HandHeart,
    title: "Gratis en la beta",
    text: "Cero costo mientras crecemos. Los aliados fundadores tienen prioridad cuando abramos destacados.",
  },
];

const STEPS = [
  { n: 1, title: "Te registras aquí", text: "Un formulario corto: te tomas 2 minutos y listo." },
  { n: 2, title: "Conversamos por WhatsApp", text: "Dentro de 48 h te contactamos para crear tu ficha con foto y descripción." },
  { n: 3, title: "La comunidad te descubre", text: "Apareces en la app y en eventos de la red. Tu público te encuentra." },
];

const initialForm = {
  contact_name: "",
  company: "",
  comuna: "",
  email: "",
  whatsapp: "",
  offer_type: "",
  offer_text: "",
  accept_public: false,
  website: "", // honeypot — must stay empty
};

export default function Convenios() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const formSectionRef = useRef(null);

  // SEO meta tags
  useEffect(() => {
    const prev = { title: document.title };
    document.title = PAGE_TITLE;

    const setMeta = (attr, key, value) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      const before = tag.getAttribute("content");
      tag.setAttribute("content", value);
      return { tag, before };
    };

    const restores = [
      setMeta("name", "description", PAGE_DESC),
      setMeta("property", "og:title", PAGE_TITLE),
      setMeta("property", "og:description", PAGE_DESC),
      setMeta("property", "og:type", "website"),
      setMeta("property", "og:url", PAGE_URL),
      setMeta("name", "twitter:card", "summary_large_image"),
      setMeta("name", "twitter:title", PAGE_TITLE),
      setMeta("name", "twitter:description", PAGE_DESC),
    ];

    let canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical ? canonical.getAttribute("href") : null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", PAGE_URL);

    return () => {
      document.title = prev.title;
      restores.forEach(({ tag, before }) => {
        if (before == null) tag.remove();
        else tag.setAttribute("content", before);
      });
      if (prevCanonical !== null) canonical.setAttribute("href", prevCanonical);
    };
  }, []);

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const update = (k) => (e) => {
    const v = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.contact_name.trim()) e.contact_name = "Ingresa tu nombre";
    if (!form.company.trim()) e.company = "Ingresa el nombre del lugar";
    if (!form.comuna) e.comuna = "Elige tu comuna";
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Email inválido";
    const digits = (form.whatsapp || "").replace(/\D/g, "");
    if (digits.length < 8) e.whatsapp = "WhatsApp inválido — usa formato +569XXXXXXXX";
    if (!form.offer_type) e.offer_type = "Elige el tipo de oferta";
    if (!form.offer_text.trim() || form.offer_text.trim().length < 10) e.offer_text = "Cuéntanos brevemente qué ofreces (mínimo 10 caracteres)";
    if (!form.accept_public) e.accept_public = "Necesitamos que aceptes recibir a la comunidad";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post("/partners", {
        contact_name: form.contact_name.trim(),
        company: form.company.trim(),
        comuna: form.comuna,
        email: form.email.trim().toLowerCase(),
        whatsapp: form.whatsapp.trim(),
        offer_type: form.offer_type,
        offer_text: form.offer_text.trim(),
        accept_public: form.accept_public,
        website: form.website, // honeypot
      });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = formatApiError(err?.response?.data?.detail);
      toast.error(msg || "No pudimos enviar tu solicitud. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1524]">
      {/* Ambient gradient */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[560px] -z-10 opacity-70">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-orange-100 via-rose-100 to-transparent blur-3xl"/>
        <div className="absolute -top-32 right-0 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-violet-100 via-indigo-100 to-transparent blur-3xl"/>
      </div>

      {/* Nav */}
      <nav className="mx-auto max-w-6xl px-5 sm:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" data-testid="convenios-logo">
          <div className="w-10 h-10 rounded-2xl ps-gradient flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sprout size={20} className="text-white" strokeWidth={2}/>
          </div>
          <span className="font-display text-xl font-black tracking-tight">PlanSobrio</span>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#EAF7EF] text-[#16A34A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"/> Beta
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/promocion"
            data-testid="convenios-nav-promocion"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            La app
          </Link>
          <Link
            to="/blog"
            data-testid="convenios-nav-blog"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            Blog
          </Link>
          <button
            onClick={scrollToForm}
            data-testid="convenios-nav-cta"
            className="inline-flex items-center gap-1.5 rounded-full ps-gradient text-white px-4 py-2 text-sm font-bold shadow-md shadow-purple-500/30 hover:opacity-95 transition"
          >
            Sumarme gratis <ArrowRight size={15} strokeWidth={2.4}/>
          </button>
        </div>
      </nav>

      {success ? (
        <SuccessBlock />
      ) : (
        <>
          {/* Hero */}
          <header className="mx-auto max-w-6xl px-5 sm:px-8 pt-10 sm:pt-16 pb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E7E4EE] bg-white/80 backdrop-blur px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600" data-testid="convenios-hero-badge">
              <HandHeart size={12} strokeWidth={2.4}/> Para lugares y comercios
            </div>
            <h1
              data-testid="convenios-hero-title"
              className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.02] tracking-tight max-w-4xl"
            >
              Suma tu lugar a la red de <span className="ps-gradient-text">panoramas sin alcohol</span>.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed" data-testid="convenios-hero-sub">
              Conecta con un público que busca planes de día, sin alcohol, y que es fiel a los lugares donde
              se siente bien recibido. Aparece en el mapa de PlanSobrio, gana el sello «Lugar PlanSobrio»
              y llega a personas que hoy nadie está mirando.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={scrollToForm}
                data-testid="convenios-hero-cta"
                className="inline-flex items-center gap-2 rounded-full ps-gradient text-white px-6 py-3.5 text-[15px] font-bold shadow-lg shadow-purple-500/30 hover:opacity-95 transition"
              >
                Quiero sumarme gratis <ArrowRight size={17} strokeWidth={2.4}/>
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF7EF] text-[#16A34A] px-3 py-2 text-[13px] font-bold">
                <CheckCircle2 size={14} strokeWidth={2.4}/> Gratis en la beta
              </span>
            </div>
          </header>

          {/* Benefits */}
          <section className="mx-auto max-w-6xl px-5 sm:px-8 py-8" id="beneficios">
            <div className="mb-8 max-w-2xl">
              <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Por qué sumarte a <span className="ps-gradient-text">PlanSobrio</span>
              </h2>
              <p className="mt-3 text-slate-600">
                No te vendemos publicidad. Te presentamos un público difícil de alcanzar por otros medios:
                personas que ya decidieron cómo pasarlo bien sin alcohol.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="convenios-benefits-grid">
              {BENEFITS.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="rounded-3xl border border-[#E7E4EE] bg-white p-6 shadow-sm hover:shadow-md transition">
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                      <Icon size={20} strokeWidth={2} className="text-slate-800"/>
                    </div>
                    <h3 className="font-display text-lg font-black tracking-tight">{b.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{b.text}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Steps */}
          <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14 bg-[#F6F5F9] rounded-3xl my-8" id="como-funciona">
            <div className="mb-8 max-w-2xl">
              <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Cómo funciona
              </h2>
              <p className="mt-3 text-slate-600">Tres pasos y ya estás en el mapa.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5" data-testid="convenios-steps">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-3xl bg-white border border-[#E7E4EE] p-6">
                  <div className="w-11 h-11 rounded-2xl ps-gradient text-white font-display font-black flex items-center justify-center mb-4 shadow-md shadow-purple-500/25">
                    {s.n}
                  </div>
                  <h3 className="font-display text-lg font-black tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Trust note */}
          <section className="mx-auto max-w-4xl px-5 sm:px-8 py-8 text-center">
            <p className="text-slate-600 text-base leading-relaxed">
              PlanSobrio es un proyecto de{" "}
              <a
                href="https://sinadicciones.org"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#8B5CF6] underline underline-offset-2 hover:text-[#6D28D9]"
              >
                SinAdicciones.org
              </a>
              , la comunidad chilena para vivir sin alcohol ni drogas. No te pedimos que dejes de vender
              alcohol — te pedimos que ofrezcas una buena experiencia sin que el trago sea el centro.
            </p>
          </section>

          {/* Form */}
          <section ref={formSectionRef} id="registro" className="mx-auto max-w-3xl px-5 sm:px-8 py-12">
            <div className="rounded-3xl border border-[#E7E4EE] bg-white p-6 sm:p-10 shadow-sm">
              <div className="mb-6">
                <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Registra tu lugar
                </h2>
                <p className="mt-2 text-slate-600">Toma 2 minutos. Te contactamos por WhatsApp dentro de 48 horas.</p>
              </div>

              <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="convenios-form">
                {/* Honeypot — hidden from users, catches bots */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Sitio web (dejar vacío)</label>
                  <input
                    type="text"
                    id="website"
                    tabIndex="-1"
                    autoComplete="off"
                    value={form.website}
                    onChange={update("website")}
                  />
                </div>

                <Field label="Nombre de contacto" error={errors.contact_name} testId="convenios-field-contact_name">
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={update("contact_name")}
                    placeholder="Tu nombre"
                    data-testid="convenios-input-contact_name"
                    className={inputCls(errors.contact_name)}
                  />
                </Field>

                <Field label="Empresa o lugar" error={errors.company} testId="convenios-field-company">
                  <input
                    type="text"
                    value={form.company}
                    onChange={update("company")}
                    placeholder="Ej: Café Verde, Yoga Ñuñoa…"
                    data-testid="convenios-input-company"
                    className={inputCls(errors.company)}
                  />
                </Field>

                <Field label="Comuna" error={errors.comuna} testId="convenios-field-comuna">
                  <select
                    value={form.comuna}
                    onChange={update("comuna")}
                    data-testid="convenios-input-comuna"
                    className={inputCls(errors.comuna)}
                  >
                    <option value="">Elige tu comuna</option>
                    {COMUNAS_RM.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Email" error={errors.email} testId="convenios-field-email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="contacto@tulugar.cl"
                    data-testid="convenios-input-email"
                    className={inputCls(errors.email)}
                  />
                </Field>

                <Field label="WhatsApp" error={errors.whatsapp} testId="convenios-field-whatsapp" fullWidth>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={update("whatsapp")}
                    placeholder="+56 9 XXXX XXXX"
                    data-testid="convenios-input-whatsapp"
                    className={inputCls(errors.whatsapp)}
                  />
                  <p className="mt-1 text-[12px] text-slate-500">Nuestro canal principal — te contactamos por acá.</p>
                </Field>

                <Field label="Tipo de oferta" error={errors.offer_type} testId="convenios-field-offer_type" fullWidth>
                  <select
                    value={form.offer_type}
                    onChange={update("offer_type")}
                    data-testid="convenios-input-offer_type"
                    className={inputCls(errors.offer_type)}
                  >
                    <option value="">Elige el tipo de espacio</option>
                    {OFFER_TYPES.map((o) => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </select>
                </Field>

                <Field label="¿Qué puedes ofrecer a la comunidad?" error={errors.offer_text} testId="convenios-field-offer_text" fullWidth>
                  <textarea
                    value={form.offer_text}
                    onChange={update("offer_text")}
                    rows={4}
                    placeholder="Ej: 2x1 en cafés de día, clase de prueba gratis, descuento en la entrada, evento sin alcohol una vez al mes…"
                    data-testid="convenios-input-offer_text"
                    className={inputCls(errors.offer_text)}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <label className="flex items-start gap-3 cursor-pointer" data-testid="convenios-field-accept_public">
                    <input
                      type="checkbox"
                      checked={form.accept_public}
                      onChange={update("accept_public")}
                      data-testid="convenios-input-accept_public"
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                    />
                    <span className="text-sm text-slate-700 leading-relaxed">
                      Entiendo que PlanSobrio conecta con un público que vive sin alcohol y quiero recibir a esa comunidad.
                    </span>
                  </label>
                  {errors.accept_public && (
                    <p className="mt-2 text-sm text-rose-600" data-testid="convenios-error-accept_public">{errors.accept_public}</p>
                  )}
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    data-testid="convenios-submit-btn"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full ps-gradient text-white px-6 py-4 text-[15px] font-bold shadow-lg shadow-purple-500/30 hover:opacity-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Enviando…" : (<>Enviar solicitud <Send size={16} strokeWidth={2.4}/></>)}
                  </button>
                  <p className="mt-3 text-center text-[12px] text-slate-500">
                    Al enviar, recibirás un correo de confirmación y nuestro equipo te contactará por WhatsApp.
                  </p>
                </div>
              </form>
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-5 sm:px-8 py-10 border-t border-slate-200 mt-8">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl ps-gradient flex items-center justify-center">
              <Sprout size={14} className="text-white" strokeWidth={2.2}/>
            </div>
            <span className="font-display font-black text-slate-900">PlanSobrio</span>
            <span className="opacity-70 inline-flex items-center gap-1">
              · hecho con <Heart size={12} strokeWidth={0} fill="#FF6B5E" className="inline-block"/> desde{" "}
              <a href="https://sinadicciones.org" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 hover:text-[#8B5CF6] transition underline underline-offset-2 decoration-slate-300">
                Sinadicciones.org
              </a>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/promocion" className="hover:text-slate-900 transition" data-testid="convenios-footer-promocion">La app</Link>
            <Link to="/blog" className="hover:text-slate-900 transition" data-testid="convenios-footer-blog">Blog</Link>
            <Link to="/terminos" className="hover:text-slate-900 transition">Términos</Link>
            <Link to="/privacidad" className="hover:text-slate-900 transition">Privacidad</Link>
            <a href="mailto:contacto@sinadicciones.org" className="hover:text-slate-900 transition">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function inputCls(hasError) {
  return `w-full rounded-2xl border ${hasError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-400/30" : "border-slate-200 focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/25"} bg-white px-4 py-3 text-[15px] outline-none focus:ring-4 transition placeholder:text-slate-400`;
}

function Field({ label, error, children, testId, fullWidth = false }) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""} data-testid={testId}>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-sm text-rose-600" data-testid={`${testId}-error`}>{error}</p>}
    </div>
  );
}

function SuccessBlock() {
  return (
    <section className="mx-auto max-w-3xl px-5 sm:px-8 py-16 sm:py-24" data-testid="convenios-success">
      <div className="rounded-3xl border border-[#E7E4EE] bg-white p-8 sm:p-12 shadow-sm text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-[#EAF7EF] flex items-center justify-center mb-6">
          <CheckCircle2 size={32} className="text-[#16A34A]" strokeWidth={2}/>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-tight">
          ¡Gracias! 🎉 Recibimos tu solicitud
        </h1>
        <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed">
          Te contactaremos por <strong className="text-slate-900">WhatsApp</strong> dentro de <strong className="text-slate-900">48 horas</strong> para
          conversar sobre tu propuesta y crear tu ficha en PlanSobrio.
        </p>
        <p className="mt-3 text-slate-500 text-sm">
          También revisa tu correo — te enviamos una confirmación con los próximos pasos.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/promocion"
            className="inline-flex items-center gap-2 rounded-full ps-gradient text-white px-6 py-3 text-sm font-bold shadow-md shadow-purple-500/25 hover:opacity-95 transition"
            data-testid="convenios-success-explore"
          >
            Conocer PlanSobrio <ArrowRight size={15} strokeWidth={2.4}/>
          </Link>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white text-slate-900 px-6 py-[10px] text-sm font-bold hover:bg-slate-900 hover:text-white transition"
          >
            Leer el blog
          </Link>
        </div>
      </div>
    </section>
  );
}
