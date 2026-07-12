import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Sprout, ArrowRight, Clock, Calendar, ChevronRight, Heart } from "lucide-react";

const SITE_URL = "https://plansobrio.com";

function useBlogSEO(title, description, path) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    const setMeta = (name, content, attr = "name") => {
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, name); document.head.appendChild(tag); }
      const prev = tag.getAttribute("content");
      tag.setAttribute("content", content);
      return () => { if (prev !== null) tag.setAttribute("content", prev); };
    };
    const restore = [
      setMeta("description", description),
      setMeta("og:title", title, "property"),
      setMeta("og:description", description, "property"),
      setMeta("og:url", SITE_URL + path, "property"),
    ];
    let canonical = document.querySelector('link[rel="canonical"]');
    const prevC = canonical ? canonical.getAttribute("href") : null;
    if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
    canonical.setAttribute("href", SITE_URL + path);
    return () => {
      document.title = prevTitle;
      restore.forEach((r) => r());
      if (prevC !== null) canonical.setAttribute("href", prevC);
    };
  }, [title, description, path]);
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useBlogSEO(
    "Blog PlanSobrio — Vida sin alcohol ni drogas",
    "Artículos y guías para vivir sin alcohol ni drogas: panoramas, mocktails, habilidades sociales y comunidad sobria en Chile.",
    "/blog"
  );

  useEffect(() => {
    api.get("/blog/posts").then((r) => setPosts(r.data)).finally(() => setLoading(false));
  }, []);

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-sans" data-testid="blog-list-page">
      {/* Nav */}
      <nav className="mx-auto max-w-6xl px-5 sm:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl ps-gradient flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sprout size={20} className="text-white" strokeWidth={2}/>
          </div>
          <span className="font-display text-xl font-black tracking-tight">PlanSobrio</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/promocion" className="hidden sm:inline text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2">Sobre PlanSobrio</Link>
          <Link to="/registro" className="inline-flex items-center gap-1.5 rounded-full ps-gradient text-white px-4 py-2 text-sm font-bold shadow-md hover:opacity-95">
            Crear cuenta <ArrowRight size={15} strokeWidth={2.4}/>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="mx-auto max-w-4xl px-5 sm:px-8 pt-8 pb-10">
        <nav className="text-xs text-slate-500 mb-4 flex items-center gap-1.5" data-testid="blog-breadcrumb">
          <Link to="/" className="hover:text-slate-900">Inicio</Link>
          <ChevronRight size={12}/>
          <span className="text-slate-900 font-semibold">Blog</span>
        </nav>
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]" data-testid="blog-title">
          Blog <span className="ps-gradient-text">PlanSobrio</span>
        </h1>
        <p className="mt-4 text-slate-600 text-lg max-w-2xl leading-relaxed">
          Guías, ideas y reflexiones para vivir sin alcohol ni drogas — y encontrar la comunidad que las acompaña.
        </p>
      </header>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-16">
        {loading && <p className="text-slate-500 text-sm">Cargando…</p>}
        {!loading && posts.length === 0 && (
          <div className="border border-slate-200 rounded-3xl p-10 text-center bg-slate-50">
            <p className="text-slate-500">Aún no hay artículos publicados. Vuelve pronto.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => (
            <Link
              key={p.id}
              to={`/blog/${p.slug}`}
              data-testid={`blog-card-${p.slug}`}
              className="group rounded-3xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:-translate-y-0.5 transition"
            >
              {p.cover_url && (
                <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                  <img src={p.cover_url} alt={p.cover_alt || p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
                  <span className="inline-flex items-center gap-1"><Calendar size={11} strokeWidth={2}/> {fmt(p.published_at)}</span>
                  <span className="inline-flex items-center gap-1"><Clock size={11} strokeWidth={2}/> {p.reading_minutes} min</span>
                </div>
                <h2 className="mt-3 font-display text-xl font-black leading-tight text-slate-900 group-hover:text-[#8B5CF6] transition">{p.title}</h2>
                <p className="mt-2 text-[14px] text-slate-600 leading-relaxed line-clamp-3">{p.excerpt}</p>
                {p.tags?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
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
              · Hecho con <Heart size={12} strokeWidth={0} fill="#F59E0B" className="inline-block"/> desde{" "}
              <a href="https://sinadicciones.org" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 hover:text-[#8B5CF6] underline underline-offset-2 decoration-slate-300">
                SinAdicciones.org
              </a>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/promocion" className="hover:text-slate-900">Sobre PlanSobrio</Link>
            <Link to="/terminos" className="hover:text-slate-900">Términos</Link>
            <Link to="/privacidad" className="hover:text-slate-900">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
