import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Avatar from "@/components/Avatar";
import {
  LifeBuoy, PencilLine, LogOut, Settings, ExternalLink, Trash2,
  MapPin, Sprout, ChevronRight, HeartHandshake, Smile, Heart, Users,
} from "lucide-react";
import { MODES, soberLabel } from "@/constants/comunas";
import { fileUrl, formatApiError } from "@/lib/api";
import api from "@/lib/api";
import { toast } from "sonner";

const MODE_ICON = { apoyo: HeartHandshake, amistad: Smile, amor: Heart, grupos: Users };

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

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
