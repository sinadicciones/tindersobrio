import { useEffect, useRef, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit3, Eye, Save, Bold, Italic, List, ListOrdered,
  Link2, Heading2, Heading3, Sparkles, Image as ImageIcon,
} from "lucide-react";

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

const emptyPost = {
  slug: "", title: "", meta_description: "", excerpt: "", content_html: "",
  cover_url: "", cover_alt: "", author_name: "Equipo PlanSobrio",
  author_bio: "Escribimos desde SinAdicciones.org, la comunidad chilena para vivir sin alcohol ni drogas.",
  tags: [], keyword: "", status: "borrador",
  cta_soft_title: "", cta_soft_text: "",
};

export default function BlogAdmin() {
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(null); // null | {post}
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/admin/blog/posts").then((r) => setPosts(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const del = async (p) => {
    if (!window.confirm(`¿Eliminar el post "${p.title}"?`)) return;
    try {
      await api.delete(`/admin/blog/posts/${p.id}`);
      toast.success("Post eliminado");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  if (editing !== null) {
    return <BlogEditor initial={editing} onClose={() => { setEditing(null); load(); }}/>;
  }

  return (
    <div data-testid="blog-admin">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black">Blog</h2>
          <p className="text-xs text-white/50">Crear y publicar artículos en plansobrio.com/blog</p>
        </div>
        <button
          data-testid="blog-new-btn"
          onClick={() => setEditing({ ...emptyPost })}
          className="inline-flex items-center gap-2 rounded-full ps-gradient px-4 py-2 text-sm font-bold text-white"
        >
          <Plus size={15}/> Nuevo post
        </button>
      </div>

      {loading && <p className="text-white/50 text-sm">Cargando…</p>}
      {!loading && posts.length === 0 && (
        <div className="rounded-2xl border border-white/10 p-8 text-center text-white/50 bg-white/[.02]">
          Aún no hay posts. Crea el primero.
        </div>
      )}

      <div className="space-y-2">
        {posts.map((p) => (
          <div key={p.id} data-testid={`blog-row-${p.slug}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.status === "publicado" ? "bg-[#4ADE80]/20 text-[#4ADE80]" : "bg-white/10 text-white/60"}`}>
                  {p.status}
                </span>
                <span className="text-[11px] text-white/40">/blog/{p.slug}</span>
              </div>
              <p className="font-display font-black text-[15px] leading-tight mt-1 truncate">{p.title}</p>
              <p className="text-[12px] text-white/50 mt-0.5">{p.reading_minutes} min · {p.tags?.join(" · ")}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {p.status === "publicado" && (
                <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 hover:bg-white/10" data-testid={`blog-view-${p.slug}`}>
                  <Eye size={14}/>
                </a>
              )}
              <button onClick={() => setEditing(p)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10" data-testid={`blog-edit-${p.slug}`}>
                <Edit3 size={14}/>
              </button>
              <button onClick={() => del(p)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300" data-testid={`blog-del-${p.slug}`}>
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlogEditor({ initial, onClose }) {
  const [f, setF] = useState({
    ...emptyPost,
    ...initial,
    tags: Array.isArray(initial?.tags) ? initial.tags : [],
  });
  const [saving, setSaving] = useState(false);
  const [genCover, setGenCover] = useState(false);
  const [preview, setPreview] = useState(false);
  const editorRef = useRef(null);
  const isNew = !initial?.id;

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Auto-slug from title
  useEffect(() => {
    if (isNew && f.title && !f.slug) set("slug", slugify(f.title));
  }, [f.title, isNew]);  // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (cmd, val) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    set("content_html", editorRef.current?.innerHTML || "");
  };

  const insertCtaMarker = () => {
    const html = editorRef.current?.innerHTML || "";
    editorRef.current.innerHTML = html + "<p>[[CTA_SOFT]]</p>";
    set("content_html", editorRef.current.innerHTML);
  };

  const generateCover = async () => {
    if (!f.title) { toast.error("Necesito el título para generar la imagen"); return; }
    setGenCover(true);
    try {
      const prompt = f.keyword || f.title;
      const r = await api.post("/admin/blog/cover-gen", { prompt, slug: f.slug });
      set("cover_url", r.data.url);
      toast.success("Portada generada con IA");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setGenCover(false); }
  };

  const save = async () => {
    if (!f.title || !f.slug) { toast.error("Título y slug son obligatorios"); return; }
    setSaving(true);
    // Sync editor HTML
    const payload = { ...f, content_html: editorRef.current?.innerHTML || f.content_html };
    payload.slug = slugify(payload.slug);
    payload.tags = (typeof payload.tags === "string" ? payload.tags.split(",").map((t) => t.trim()).filter(Boolean) : payload.tags) || [];
    try {
      if (isNew) await api.post("/admin/blog/posts", payload);
      else await api.patch(`/admin/blog/posts/${initial.id}`, payload);
      toast.success(isNew ? "Post creado" : "Post actualizado");
      onClose();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <div data-testid="blog-editor">
      <button onClick={onClose} className="text-sm text-white/60 hover:text-white mb-3">← Volver al listado</button>
      <h2 className="text-xl font-black">{isNew ? "Nuevo post" : "Editar post"}</h2>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-3">
          {/* Title & slug */}
          <input data-testid="blog-title-input" placeholder="Título del post" value={f.title} onChange={(e)=>set("title", e.target.value)} className="w-full rounded-xl bg-white/[.05] border border-white/10 px-4 py-3 text-[15px] font-bold"/>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/40 font-mono">/blog/</span>
            <input data-testid="blog-slug-input" placeholder="slug-del-post" value={f.slug} onChange={(e)=>set("slug", slugify(e.target.value))} className="flex-1 rounded-xl bg-white/[.05] border border-white/10 px-3 py-2 text-[13px] font-mono"/>
          </div>

          <textarea data-testid="blog-excerpt-input" placeholder="Excerpt / resumen (visible en la grilla)" value={f.excerpt} onChange={(e)=>set("excerpt", e.target.value)} rows={2} className="w-full rounded-xl bg-white/[.05] border border-white/10 px-4 py-2 text-[13px]"/>

          <textarea data-testid="blog-meta-desc" placeholder="Meta description (SEO — 150-160 caracteres)" value={f.meta_description} onChange={(e)=>set("meta_description", e.target.value)} rows={2} maxLength={200} className="w-full rounded-xl bg-white/[.05] border border-white/10 px-4 py-2 text-[13px]"/>

          {/* Editor toolbar */}
          <div className="rounded-xl bg-white/[.03] border border-white/10">
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/10">
              <button type="button" onClick={()=>fmt("bold")} className="p-1.5 hover:bg-white/10 rounded" data-testid="fmt-bold" title="Negrita"><Bold size={14}/></button>
              <button type="button" onClick={()=>fmt("italic")} className="p-1.5 hover:bg-white/10 rounded" title="Cursiva"><Italic size={14}/></button>
              <span className="w-px h-4 bg-white/20 mx-1"/>
              <button type="button" onClick={()=>fmt("formatBlock", "h2")} className="p-1.5 hover:bg-white/10 rounded" data-testid="fmt-h2" title="H2"><Heading2 size={14}/></button>
              <button type="button" onClick={()=>fmt("formatBlock", "h3")} className="p-1.5 hover:bg-white/10 rounded" title="H3"><Heading3 size={14}/></button>
              <button type="button" onClick={()=>fmt("formatBlock", "p")} className="p-1.5 hover:bg-white/10 rounded text-xs" title="Párrafo">P</button>
              <span className="w-px h-4 bg-white/20 mx-1"/>
              <button type="button" onClick={()=>fmt("insertUnorderedList")} className="p-1.5 hover:bg-white/10 rounded" title="Lista"><List size={14}/></button>
              <button type="button" onClick={()=>fmt("insertOrderedList")} className="p-1.5 hover:bg-white/10 rounded" title="Lista numerada"><ListOrdered size={14}/></button>
              <span className="w-px h-4 bg-white/20 mx-1"/>
              <button type="button" onClick={()=>{ const url = prompt("URL del link:"); if (url) fmt("createLink", url); }} className="p-1.5 hover:bg-white/10 rounded" title="Link"><Link2 size={14}/></button>
              <span className="w-px h-4 bg-white/20 mx-1"/>
              <button type="button" onClick={insertCtaMarker} data-testid="fmt-cta" className="px-2 py-1 hover:bg-white/10 rounded text-[10px] font-bold text-[#4ADE80]" title="Insertar CTA suave">[[CTA_SOFT]]</button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              data-testid="blog-editor-body"
              onInput={(e) => set("content_html", e.currentTarget.innerHTML)}
              className="min-h-[400px] p-4 focus:outline-none text-[14px] leading-relaxed prose-editor"
              style={{ maxHeight: "600px", overflowY: "auto" }}
              dangerouslySetInnerHTML={{ __html: f.content_html || "" }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Cover */}
          <div className="rounded-xl bg-white/[.03] border border-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">Portada</p>
            {f.cover_url && (
              <img src={f.cover_url} alt="cover" className="w-full aspect-[16/9] object-cover rounded-lg mb-2"/>
            )}
            <input value={f.cover_url || ""} onChange={(e)=>set("cover_url", e.target.value)} placeholder="URL de la portada" className="w-full rounded-lg bg-white/[.05] border border-white/10 px-3 py-2 text-[12px] mb-2"/>
            <input value={f.cover_alt || ""} onChange={(e)=>set("cover_alt", e.target.value)} placeholder="Alt (descripción)" className="w-full rounded-lg bg-white/[.05] border border-white/10 px-3 py-2 text-[12px] mb-2"/>
            <button onClick={generateCover} disabled={genCover} data-testid="blog-gen-cover" className="w-full inline-flex items-center justify-center gap-2 rounded-lg ps-gradient text-white text-[12px] font-bold py-2 disabled:opacity-50">
              <Sparkles size={13}/> {genCover ? "Generando…" : "Generar con IA (Nano Banana)"}
            </button>
          </div>

          {/* SEO */}
          <div className="rounded-xl bg-white/[.03] border border-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">SEO</p>
            <input value={f.keyword || ""} onChange={(e)=>set("keyword", e.target.value)} placeholder="Palabra clave" className="w-full rounded-lg bg-white/[.05] border border-white/10 px-3 py-2 text-[12px] mb-2"/>
            <input value={Array.isArray(f.tags) ? f.tags.join(", ") : f.tags} onChange={(e)=>set("tags", e.target.value)} placeholder="Tags (coma)" className="w-full rounded-lg bg-white/[.05] border border-white/10 px-3 py-2 text-[12px]"/>
          </div>

          {/* CTA soft */}
          <div className="rounded-xl bg-white/[.03] border border-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">CTA suave (para <code>[[CTA_SOFT]]</code>)</p>
            <input value={f.cta_soft_title || ""} onChange={(e)=>set("cta_soft_title", e.target.value)} placeholder="Título CTA" className="w-full rounded-lg bg-white/[.05] border border-white/10 px-3 py-2 text-[12px] mb-2"/>
            <textarea value={f.cta_soft_text || ""} onChange={(e)=>set("cta_soft_text", e.target.value)} rows={3} placeholder="Texto CTA" className="w-full rounded-lg bg-white/[.05] border border-white/10 px-3 py-2 text-[12px]"/>
          </div>

          {/* Status */}
          <div className="rounded-xl bg-white/[.03] border border-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">Estado</p>
            <div className="grid grid-cols-2 gap-2">
              {["borrador", "publicado"].map((s) => (
                <button key={s} onClick={()=>set("status", s)} data-testid={`blog-status-${s}`}
                  className={`px-3 py-2 rounded-lg text-[12px] font-bold ${f.status === s ? "ps-gradient text-white" : "bg-white/5 text-white/60"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving} data-testid="blog-save-btn" className="w-full inline-flex items-center justify-center gap-2 rounded-xl ps-gradient text-white font-bold py-3 disabled:opacity-50">
            <Save size={15}/> {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {preview && <div/>}
    </div>
  );
}
