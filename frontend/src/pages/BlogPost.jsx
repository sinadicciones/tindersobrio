import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/api";
import BlogCTA from "@/components/BlogCTA";
import { Sprout, ArrowRight, Clock, Calendar, ChevronRight, Heart, ArrowLeft } from "lucide-react";

const SITE_URL = "https://plansobrio.com";

// Parses content_html and replaces [[CTA_SOFT]] markers with React BlogCTA components.
function renderContent(html, ctaTitle, ctaText) {
  if (!html) return null;
  const parts = html.split("[[CTA_SOFT]]");
  return parts.map((chunk, i) => (
    <div key={i}>
      <div dangerouslySetInnerHTML={{ __html: chunk }} className="prose-content"/>
      {i < parts.length - 1 && <BlogCTA variant="soft" title={ctaTitle} text={ctaText}/>}
    </div>
  ));
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPost(null); setError(false);
    api.get(`/blog/posts/${slug}`)
      .then((r) => setPost(r.data))
      .catch(() => setError(true));
    api.get(`/blog/related/${slug}`).then((r) => setRelated(r.data)).catch(() => {});
  }, [slug]);

  // SEO — dynamic meta + JSON-LD Article + BreadcrumbList
  useEffect(() => {
    if (!post) return;
    const url = `${SITE_URL}/blog/${post.slug}`;
    const title = `${post.title} — PlanSobrio`;
    const desc = post.meta_description || post.excerpt || "";
    const cover = post.cover_url || `${SITE_URL}/og.png`;
    const prev = { title: document.title };
    document.title = title;

    const setMeta = (name, content, attr = "name") => {
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, name); document.head.appendChild(tag); }
      const p = tag.getAttribute("content");
      tag.setAttribute("content", content);
      return () => { if (p !== null) tag.setAttribute("content", p); };
    };
    const restore = [
      setMeta("description", desc),
      setMeta("og:type", "article", "property"),
      setMeta("og:title", title, "property"),
      setMeta("og:description", desc, "property"),
      setMeta("og:url", url, "property"),
      setMeta("og:image", cover, "property"),
      setMeta("article:published_time", post.published_at || "", "property"),
      setMeta("article:modified_time", post.updated_at || post.published_at || "", "property"),
      setMeta("twitter:card", "summary_large_image"),
      setMeta("twitter:title", title),
      setMeta("twitter:description", desc),
      setMeta("twitter:image", cover),
    ];

    let canonical = document.querySelector('link[rel="canonical"]');
    const prevC = canonical ? canonical.getAttribute("href") : null;
    if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
    canonical.setAttribute("href", url);

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.setAttribute("data-ld", "blogpost");
    ld.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: desc,
        image: [cover],
        datePublished: post.published_at,
        dateModified: post.updated_at || post.published_at,
        author: { "@type": "Person", name: post.author_name },
        publisher: {
          "@type": "Organization",
          name: "PlanSobrio",
          logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon-512.png` },
        },
        mainEntityOfPage: url,
        inLanguage: "es-CL",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL + "/" },
          { "@type": "ListItem", position: 2, name: "Blog", item: SITE_URL + "/blog" },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ]);
    document.head.appendChild(ld);

    return () => {
      document.title = prev.title;
      restore.forEach((r) => r());
      if (prevC !== null) canonical.setAttribute("href", prevC);
      ld.remove();
    };
  }, [post]);

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }) : "";

  if (error) {
    return (
      <div className="min-h-screen bg-white text-[#0F172A] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-3xl font-black mb-3">Post no encontrado</h1>
          <Link to="/blog" className="text-[#8B5CF6] font-semibold underline">← Ver todos los artículos</Link>
        </div>
      </div>
    );
  }
  if (!post) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-500">Cargando…</div>;

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-sans" data-testid="blog-post-page">
      {/* Nav */}
      <nav className="mx-auto max-w-6xl px-5 sm:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl ps-gradient flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sprout size={20} className="text-white" strokeWidth={2}/>
          </div>
          <span className="font-display text-xl font-black tracking-tight">PlanSobrio</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/blog" className="hidden sm:inline text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2">Blog</Link>
          <Link to="/registro" className="inline-flex items-center gap-1.5 rounded-full ps-gradient text-white px-4 py-2 text-sm font-bold shadow-md hover:opacity-95">
            Crear cuenta <ArrowRight size={15} strokeWidth={2.4}/>
          </Link>
        </div>
      </nav>

      {/* Article */}
      <article className="mx-auto max-w-[720px] px-5 sm:px-8 pt-6 pb-16" data-testid="blog-article">
        {/* Breadcrumbs */}
        <nav className="text-xs text-slate-500 mb-6 flex items-center gap-1.5 flex-wrap" data-testid="blog-breadcrumb">
          <Link to="/" className="hover:text-slate-900">Inicio</Link>
          <ChevronRight size={12}/>
          <Link to="/blog" className="hover:text-slate-900">Blog</Link>
          <ChevronRight size={12}/>
          <span className="text-slate-900 font-semibold line-clamp-1">{post.title}</span>
        </nav>

        {/* Title & meta */}
        <header>
          <div className="flex items-center gap-4 text-[12px] text-slate-500 font-semibold">
            <span className="inline-flex items-center gap-1"><Calendar size={12} strokeWidth={2}/> {fmt(post.published_at)}</span>
            <span className="inline-flex items-center gap-1"><Clock size={12} strokeWidth={2}/> {post.reading_minutes} min de lectura</span>
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.08] text-slate-900" data-testid="blog-post-title">
            {post.title}
          </h1>
          {post.excerpt && <p className="mt-4 text-lg text-slate-600 leading-relaxed">{post.excerpt}</p>}

          {/* Author bio */}
          <div className="mt-6 flex items-start gap-3 border-y border-slate-200 py-4">
            <div className="w-11 h-11 rounded-full ps-gradient flex items-center justify-center text-white font-black text-sm shrink-0">
              PS
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-[15px] text-slate-900">{post.author_name}</p>
              {post.author_bio && <p className="text-[13px] text-slate-600 leading-relaxed mt-0.5">{post.author_bio}</p>}
            </div>
          </div>
        </header>

        {/* Cover */}
        {post.cover_url && (
          <figure className="mt-8 -mx-5 sm:mx-0">
            <img src={post.cover_url} alt={post.cover_alt || post.title} className="w-full sm:rounded-3xl aspect-[16/9] object-cover"/>
          </figure>
        )}

        {/* Content */}
        <div className="mt-8 blog-body" data-testid="blog-content">
          {renderContent(post.content_html, post.cta_soft_title, post.cta_soft_text)}
        </div>

        {/* Strong CTA (always at the end) */}
        <BlogCTA variant="strong"/>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span key={t} className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">#{t}</span>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="mt-10">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition">
            <ArrowLeft size={15} strokeWidth={2}/> Ver todos los artículos
          </Link>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 sm:px-8 py-14 border-t border-slate-200" data-testid="blog-related">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Sigue leyendo</p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-black tracking-tight">Artículos relacionados</h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {related.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug}`} className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:-translate-y-0.5 transition">
                {p.cover_url && (
                  <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                    <img src={p.cover_url} alt={p.cover_alt || p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition"/>
                  </div>
                )}
                <div className="p-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{p.reading_minutes} min</p>
                  <h3 className="mt-2 font-display font-black text-[16px] leading-tight group-hover:text-[#8B5CF6] transition">{p.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
