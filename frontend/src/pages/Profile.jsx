import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Avatar from "@/components/Avatar";
import {
  LifeBuoy, PencilLine, LogOut, Settings, ExternalLink, Trash2,
  MapPin, Sprout, ChevronRight, HeartHandshake, Smile, Heart, Users,
  Ruler, Baby, Star, Sparkles,
} from "lucide-react";
import { MODES, soberLabel } from "@/constants/comunas";
import { fileUrl, formatApiError } from "@/lib/api";
import api from "@/lib/api";
import { toast } from "sonner";

const MODE_ICON = { apoyo: HeartHandshake, amistad: Smile, amor: Heart, grupos: Users };

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [completeness, setCompleteness] = useState(null);

  useEffect(() => {
    let live = true;
    api.get("/profile/me/completeness")
      .then((r) => { if (live) setCompleteness(r.data); })
      .catch(() => {});
    return () => { live = false; };
  }, [user?.id, user?.updated_at]);

  const delAccount = async () => {
    const first = window.confirm(
      "Eliminar tu cuenta es IRREVERSIBLE.\n\n" +
      "Se borrarán para siempre: tu perfil, tus fotos, todos tus matches, chats, planes, membresías de grupos, eventos y razones guardadas.\n\n" +
      "¿Quieres continuar?"
    );
    if (!first) return;
    const typed = window.prompt(
      "Confirmación final. Escribe la palabra ELIMINAR (en mayúsculas) para borrar tu cuenta:"
    );
    if (typed !== "ELIMINAR") { toast("Cancelado. Tu cuenta sigue activa."); return; }
    try {
      await api.delete("/profile/me");
      toast.success("Cuenta eliminada. Cuídate mucho.");
      localStorage.removeItem("ps_token");
      nav("/");
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  if (!user) return null;

  const menuItem = (icon, iconTone, title, sub, onClick, to, testid, coral = false) => {
    const iconStyle = coral
      ? { color: "#FF6B5E", background: "rgba(255,107,94,.12)", border: "1px solid rgba(255,107,94,.42)" }
      : { color: iconTone || "#FFFFFF", background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.16)" };
    const outerStyle = coral
      ? "border-[#FF6B5E]/40 bg-[#FF6B5E]/[.06] hover:bg-[#FF6B5E]/[.1]"
      : "border-white/[.16] bg-white/5 hover:bg-white/10";
    const Wrapper = to
      ? ({ children }) => <Link to={to} data-testid={testid} className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl border transition ${outerStyle}`}>{children}</Link>
      : ({ children }) => <button data-testid={testid} onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl border transition ${outerStyle}`}>{children}</button>;
    return (
      <Wrapper>
        <span className="w-10 h-10 rounded-2xl grid place-items-center shrink-0" style={iconStyle}>{icon}</span>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-display text-[13.5px] font-black leading-tight text-white">{title}</p>
          {sub && <p className="text-[11px] text-[#8E93A3] mt-0.5 truncate">{sub}</p>}
        </div>
        <ChevronRight size={16} strokeWidth={1.9} className="text-[#8E93A3] shrink-0"/>
      </Wrapper>
    );
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-24">
      {completeness && completeness.percent < 100 && (
        <div data-testid="profile-completeness" className="ps-card p-4 mb-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-[14px] font-black text-white inline-flex items-center gap-1.5">
              <Sparkles size={14} strokeWidth={1.9}/> Completa tu perfil
            </p>
            <span data-testid="profile-completeness-percent" className="text-xs font-bold text-white/70">
              {completeness.percent}%
            </span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full ps-gradient transition-all" style={{ width: `${completeness.percent}%` }}/>
          </div>
          {completeness.next_suggestion && (
            <Link
              to="/app/perfil/editar"
              data-testid="profile-completeness-cta"
              className="mt-3 flex items-center justify-between text-[12px] text-white/80 hover:text-white transition"
            >
              <span>Siguiente: {completeness.next_suggestion}</span>
              <ChevronRight size={14} strokeWidth={1.9}/>
            </Link>
          )}
        </div>
      )}

      <div className="ps-card p-5">
        <div className="flex items-center gap-4">
          <Avatar user={user} size={64}/>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[20px] font-black text-white leading-tight">{user.alias}</h1>
            <p className="mt-1 text-[12px] text-[#C7CBD6] inline-flex items-center gap-1">
              <MapPin size={12} strokeWidth={1.9}/> {user.comuna}
              {user.show_sober_time && user.sober_time && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#4ADE80", background: "rgba(74,222,128,.14)", border: "1px solid rgba(74,222,128,.42)" }}>
                  <Sprout size={10} strokeWidth={1.9}/> {soberLabel(user.sober_time)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Modos: chips blancos uniformes (sin colores por modo) */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(user.modes || []).map((v) => {
            const m = MODES.find((x) => x.v === v);
            const I = MODE_ICON[v];
            return m ? (
              <span key={v} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/[.16] text-white">
                {I && <I size={12} strokeWidth={1.9}/>} {m.l}
              </span>
            ) : null;
          })}
        </div>

        {user.bio && (
          <div data-testid="profile-page-bio" className="ps-bio-card mt-4">
            <p className="ps-lab"><PencilLine size={12} strokeWidth={1.9}/> Sobre mí</p>
            <p className="mt-1 text-white leading-relaxed text-[14px]">“{user.bio}”</p>
          </div>
        )}

        {(() => {
          const items = [];
          if (user.show_height && user.height_cm) items.push({ icon: <Ruler size={14} strokeWidth={1.9}/>, label: "Estatura", value: `${user.height_cm} cm` });
          if (user.show_children && user.has_children && user.has_children !== "prefiero_no_decir") {
            const map = { si: "Tiene hijos", no: "Sin hijos" };
            if (map[user.has_children]) items.push({ icon: <Baby size={14} strokeWidth={1.9}/>, label: "Hijos", value: map[user.has_children] });
          }
          if (user.show_zodiac && user.zodiac) items.push({ icon: <Star size={14} strokeWidth={1.9}/>, label: "Signo", value: user.zodiac });
          if (!items.length) return null;
          return (
            <div data-testid="profile-details" className="mt-4 ps-card p-4 bg-white/[.03]">
              <p className="ps-lab"><Sparkles size={12} strokeWidth={1.9}/> Busca · Detalles</p>
              <ul className="mt-3 space-y-2">
                {items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-[#C7CBD6]">{it.icon}{it.label}</span>
                    <span className="font-semibold text-white">{it.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {user.photos?.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {user.photos.map((p, i) => (
              <img key={i} src={fileUrl(p)} className="aspect-square object-cover rounded-2xl" alt=""/>
            ))}
          </div>
        )}

        {user.prompts?.filter(p=>p.q&&p.a).map((p, i) => (
          <div key={i} className="mt-3 ps-card p-3 grid grid-cols-[40px_1fr] gap-3 items-start bg-white/[.03]">
            <span className="ps-icn"><PencilLine size={18} strokeWidth={1.9}/></span>
            <div>
              <p className="ps-lab"><PencilLine size={12} strokeWidth={1.9}/> {p.q?.toUpperCase()}</p>
              <p className="mt-1 text-[13.5px] text-white leading-snug">{p.a}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {menuItem(<LifeBuoy size={20} strokeWidth={1.9}/>, null, "Necesito apoyo", "Respiración, mis razones y teléfonos de ayuda", null, "/app/necesito-apoyo", "necesito-apoyo-link", true)}
        {menuItem(<PencilLine size={20} strokeWidth={1.9}/>, null, "Editar perfil", "Fotos, frases, ubicación y modos", null, "/app/perfil/editar", "edit-profile-link")}
        {user.role === "admin" && menuItem(<Settings size={20} strokeWidth={1.9}/>, null, "Panel admin", "Moderación y catálogos", null, "/admin", "admin-link")}
        {menuItem(<ExternalLink size={20} strokeWidth={1.9}/>, null, "Orientación en SinAdicciones.org", "Ayuda profesional y centros", () => window.open("https://sinadicciones.org", "_blank"), null, "external-sinadicciones")}
        {menuItem(<ExternalLink size={20} strokeWidth={1.9}/>, null, "Términos y reglas", "Cómo cuidamos la comunidad", null, "/terminos", "perfil-terms")}
        {menuItem(<ExternalLink size={20} strokeWidth={1.9}/>, null, "Política de privacidad", "Qué datos guardamos", null, "/privacidad", "perfil-privacy")}
        {menuItem(<LogOut size={20} strokeWidth={1.9}/>, null, "Cerrar sesión", null, async ()=>{ await logout(); nav("/"); }, null, "logout-btn")}
        <button data-testid="delete-account-btn" onClick={delAccount} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 transition">
          <span className="w-10 h-10 rounded-2xl grid place-items-center bg-red-500/15 border border-red-500/40"><Trash2 size={20} strokeWidth={1.9}/></span>
          <div className="flex-1 text-left">
            <p className="font-display text-[13.5px] font-black leading-tight">Eliminar cuenta</p>
            <p className="text-[11px] text-red-300/70 mt-0.5">Acción irreversible</p>
          </div>
        </button>
      </div>
    </div>
  );
}
