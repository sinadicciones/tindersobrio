import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { ArrowLeft, BookOpen } from "lucide-react";
import { BlogCard } from "./Recursos";

export default function BlogInApp() {
  const nav = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState(null);

  useEffect(() => {
    api.get("/app/blog/posts")
      .then((r) => setPosts(r.data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const tags = useMemo(() => {
    const set = new Set();
    posts.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [posts]);

  const filtered = activeTag ? posts.filter((p) => (p.tags || []).includes(activeTag)) : posts;

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-24">
      <button onClick={() => nav(-1)} data-testid="blog-app-back" className="flex items-center gap-1 text-white/70 mb-4">
        <ArrowLeft size={18}/> Volver
      </button>

      <div className="flex items-center gap-2 mb-1">
        <BookOpen size={20} strokeWidth={2}/>
        <h1 className="font-display text-3xl font-black tracking-tight">Blog</h1>
      </div>
      <p className="text-sm text-white/60 mb-5">
        Ideas, historias y guías para vivir sin alcohol. Al tocar un artículo abre la versión web.
      </p>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5" data-testid="blog-tag-filters">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${!activeTag ? "border-transparent ps-gradient text-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}
            data-testid="blog-tag-all"
          >
            Todos
          </button>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(t)}
              data-testid={`blog-tag-${t}`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${activeTag === t ? "border-transparent ps-gradient text-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-white/50 py-12">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="ps-card p-6 text-center text-sm text-white/50" data-testid="blog-app-empty">
          Aún no hay artículos {activeTag ? `con "${activeTag}"` : ""}.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => <BlogCard key={p.id || p.slug} post={p}/>)}
        </div>
      )}
    </div>
  );
}
