import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Sprout, LifeBuoy, BookOpen, ExternalLink, ClipboardCheck,
  Compass, Calendar, Sparkles, Award, Video,
} from "lucide-react";
import { COUNTRIES, countryName } from "@/constants/countries";

// Herramientas de SinAdicciones — enlazadas por país (fuente única).
const TOOLS = [
  {
    key: "autoevaluacion",
    icon: ClipboardCheck,
    title: "Test de autoevaluación",
    desc: "Descubre en 5 minutos cómo estás con el alcohol o las sustancias. Confidencial y sin diagnóstico.",
    path: "/herramientas/autoevaluacion",
    color: "from-[#8B5CF6] to-[#6366F1]",
  },
  {
    key: "biblioteca",
    icon: BookOpen,
    title: "Biblioteca de recursos",
    desc: "Guías, artículos y herramientas curadas por SinAdicciones para tu país.",
    path: "/recursos",
    color: "from-[#FF6B5E] to-[#EC4899]",
  },
  {
    key: "orientacion",
    icon: LifeBuoy,
    title: "Orientación profesional",
    desc: "Contacto con equipos y centros de tratamiento verificados.",
    path: "/orientacion",
    color: "from-[#38BDF8] to-[#0EA5E9]",
  },
];

const SIN_ADICCIONES_BASE = "https://sinadicciones.org";

function sinAdiccionesUrl(pathSuffix, countryCode) {
  const cc = (countryCode || "cl").toLowerCase();
  return `${SIN_ADICCIONES_BASE}/${cc}${pathSuffix}`;
}

export default function Recursos() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [counter, setCounter] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const userCountry = (user?.country || user?.location?.country || "CL").toUpperCase();

  const loadCounter = () => api.get("/sober-counter").then((r) => setCounter(r.data)).catch(() => {});
  useEffect(() => {
    loadCounter();
    setLoadingPosts(true);
    api.get("/app/blog/posts")
      .then((r) => setPosts(r.data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false));
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-24">
      <button onClick={() => nav(-1)} data-testid="recursos-back" className="flex items-center gap-1 text-white/70 mb-4">
        <ArrowLeft size={18}/> Volver
      </button>

      <h1 className="font-display text-3xl font-black tracking-tight mb-1">Recursos</h1>
      <p className="text-sm text-white/60 mb-6">
        Un espacio de valor para tu proceso — sin diagnóstico, sin juicios, a tu ritmo.
      </p>

      {/* Sober counter widget — glanceable si está activo, CTA si no */}
      <SoberCounterWidget counter={counter} onChanged={loadCounter}/>

      {/* Herramientas SinAdicciones */}
      <section className="mt-8 space-y-3" data-testid="tools-section">
        <p className="ps-lab flex items-center gap-1.5"><Compass size={12} strokeWidth={1.9}/> Herramientas</p>
        <p className="text-xs text-white/50 -mt-1 mb-3">Llevan a la fuente oficial en SinAdicciones.org — te abrimos en pestaña nueva.</p>
        <div className="space-y-2.5">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const url = sinAdiccionesUrl(t.path, userCountry);
            return (
              <a
                key={t.key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`tool-${t.key}`}
                className="ps-card p-4 flex items-start gap-3 hover:border-white/25 transition group"
              >
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${t.color} grid place-items-center shrink-0 shadow-md shadow-purple-500/25`}>
                  <Icon size={20} strokeWidth={2} className="text-white"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-black text-[15px] leading-tight flex items-center gap-1.5">
                    {t.title}
                    <ExternalLink size={12} strokeWidth={2} className="text-white/40 group-hover:text-white/80 transition"/>
                  </p>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">{t.desc}</p>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* Necesito apoyo — acceso directo (además del menú del Perfil) */}
      <Link
        to="/app/necesito-apoyo"
        data-testid="recursos-apoyo-link"
        className="mt-4 ps-card p-4 flex items-center gap-3 hover:border-[#FF6B5E]/40 transition"
      >
        <div className="w-11 h-11 rounded-2xl bg-[#FF6B5E]/15 border border-[#FF6B5E]/30 grid place-items-center shrink-0">
          <LifeBuoy size={20} strokeWidth={2} className="text-[#FF6B5E]"/>
        </div>
        <div className="flex-1">
          <p className="font-display font-black text-[15px] leading-tight">Necesito apoyo ahora</p>
          <p className="text-xs text-white/60 mt-0.5">Respiración, mis razones y teléfonos de ayuda</p>
        </div>
      </Link>

      {/* Reuniones online — puente al grupo Comunidad del país */}
      <Link
        to={`/app/grupos/comunidad-${userCountry.toLowerCase()}`}
        data-testid="recursos-community-link"
        className="mt-3 ps-card p-4 flex items-center gap-3 hover:border-white/25 transition"
      >
        <div className="w-11 h-11 rounded-2xl bg-white/[.09] border border-white/[.16] grid place-items-center shrink-0 text-2xl">
          {COUNTRIES.find((c) => c.code === userCountry)?.flag || "🌎"}
        </div>
        <div className="flex-1">
          <p className="font-display font-black text-[15px] leading-tight">Comunidad {countryName(userCountry)}</p>
          <p className="text-xs text-white/60 mt-0.5 inline-flex items-center gap-1.5">
            <Video size={11} strokeWidth={2}/> Reuniones online + chat de tu país
          </p>
        </div>
      </Link>

      {/* Blog — espejo, cada card abre la versión web */}
      <section className="mt-8 space-y-3" data-testid="blog-section">
        <div className="flex items-center justify-between">
          <p className="ps-lab flex items-center gap-1.5"><BookOpen size={12} strokeWidth={1.9}/> Blog</p>
          {posts.length > 0 && (
            <Link to="/app/recursos/blog" data-testid="blog-see-all" className="text-xs text-white/50 hover:text-white/90 underline decoration-white/20">
              Ver todo
            </Link>
          )}
        </div>
        {loadingPosts ? (
          <div className="ps-card p-6 text-center text-sm text-white/50">Cargando artículos…</div>
        ) : posts.length === 0 ? (
          <div className="ps-card p-6 text-center text-sm text-white/50" data-testid="blog-empty">
            Pronto tendremos artículos para leer.
          </div>
        ) : (
          <div className="space-y-2.5">
            {posts.slice(0, 3).map((p) => (
              <BlogCard key={p.id || p.slug} post={p}/>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Widget del contador — glanceable arriba de Recursos y del Perfil
function SoberCounterWidget({ counter, onChanged }) {
  const nav = useNavigate();
  if (!counter) return null;
  if (!counter.active) {
    return (
      <button
        data-testid="sober-widget-cta"
        onClick={() => nav("/app/recursos/contador")}
        className="w-full ps-card p-4 flex items-center gap-3 hover:border-[#4ADE80]/40 transition text-left"
      >
        <div className="w-11 h-11 rounded-2xl bg-[#4ADE80]/15 border border-[#4ADE80]/30 grid place-items-center shrink-0">
          <Sprout size={20} strokeWidth={2} className="text-[#4ADE80]"/>
        </div>
        <div className="flex-1">
          <p className="font-display font-black text-[15px] leading-tight">Empieza tu contador</p>
          <p className="text-xs text-white/60 mt-0.5">Un día a la vez. Solo tú lo ves.</p>
        </div>
      </button>
    );
  }
  const { days, next_milestone } = counter;
  const daysToNext = Math.max(0, next_milestone - days);
  return (
    <Link
      to="/app/recursos/contador"
      data-testid="sober-widget-active"
      className="block rounded-3xl border border-[#4ADE80]/40 bg-gradient-to-br from-[#4ADE80]/15 to-[#22C55E]/5 p-5 hover:from-[#4ADE80]/20 transition"
    >
      <div className="flex items-center gap-3 mb-2">
        <Sprout size={20} strokeWidth={2.2} className="text-[#4ADE80]"/>
        <p className="text-[10px] uppercase tracking-wider text-[#4ADE80] font-bold">Tu contador</p>
      </div>
      <p className="font-display text-4xl font-black leading-none">
        <span data-testid="sober-days" className="text-[#4ADE80]">{days}</span>
        <span className="text-white/50 text-xl ml-2 font-bold">día{days === 1 ? "" : "s"}</span>
      </p>
      <p className="text-sm text-white/70 mt-2">
        construyendo tu nueva vida 🌱
      </p>
      <p className="text-[11px] text-white/50 mt-3 inline-flex items-center gap-1.5" data-testid="sober-next-milestone">
        <Award size={11} strokeWidth={2}/> {daysToNext === 0 ? "¡Hito alcanzado hoy!" : `${daysToNext} día${daysToNext === 1 ? "" : "s"} para el próximo hito de ${next_milestone}`}
      </p>
    </Link>
  );
}

// BlogCard — imagen, título, tiempo de lectura. Abre la versión web en pestaña nueva.
function BlogCard({ post }) {
  const cover = post.cover_url || null;
  const publicUrl = `https://plansobrio.com/blog/${post.slug}`;
  return (
    <a
      href={publicUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`blog-post-${post.slug}`}
      className="ps-card p-3 flex gap-3 hover:border-white/25 transition group"
    >
      {cover ? (
        <img
          src={cover}
          alt={post.cover_alt || post.title}
          loading="lazy"
          className="w-20 h-20 rounded-2xl object-cover shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/25 to-[#FF6B5E]/25 grid place-items-center shrink-0">
          <Sparkles size={22} strokeWidth={2} className="text-white/70"/>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-display font-black text-[14px] leading-tight line-clamp-2">{post.title}</p>
        {post.tags?.length > 0 && (
          <p className="text-[10px] text-[#8B5CF6] font-bold uppercase tracking-wider mt-1.5">
            {post.tags[0]}
          </p>
        )}
        <p className="text-[11px] text-white/50 mt-1 flex items-center gap-1.5">
          <Calendar size={10} strokeWidth={2}/> {post.reading_minutes || 4} min de lectura
          <ExternalLink size={10} strokeWidth={2} className="ml-1 opacity-60 group-hover:opacity-100"/>
        </p>
      </div>
    </a>
  );
}

export { SoberCounterWidget, BlogCard };
