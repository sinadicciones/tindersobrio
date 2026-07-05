import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Avatar from "@/components/Avatar";
import { HeartHandshake, Settings, LogOut, Trash2, Pencil, ExternalLink } from "lucide-react";
import { MODES, soberLabel } from "@/constants/comunas";
import { fileUrl, formatApiError } from "@/lib/api";
import api from "@/lib/api";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const delAccount = async () => {
    if (!confirm("¿Eliminar tu cuenta? Se borrarán tus datos.")) return;
    if (!confirm("Confirmación final: esto NO se puede deshacer.")) return;
    try { await api.delete("/profile/me"); toast.success("Cuenta eliminada"); localStorage.removeItem("ps_token"); nav("/"); } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="ps-card p-5">
        <div className="flex items-center gap-4">
          <Avatar user={user} size={72}/>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-black">{user.alias}</h1>
            <p className="text-sm text-white/60">{user.comuna}</p>
            {user.show_sober_time && user.sober_time && (
              <span className="ps-chip mt-1 inline-flex text-[#4ADE80]" style={{ background: "rgba(74,222,128,0.15)", borderColor: "rgba(74,222,128,0.4)" }}>🌱 {soberLabel(user.sober_time)}</span>
            )}
          </div>
        </div>
        {user.photos?.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {user.photos.map((p, i) => (
              <img key={i} src={fileUrl(p)} className="aspect-square object-cover rounded-2xl" alt=""/>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(user.modes || []).map((v) => {
            const m = MODES.find((x) => x.v === v);
            return m ? <span key={v} className="ps-chip" style={{ background: `${m.color}22`, borderColor: `${m.color}55`, color: m.color }}>{m.emoji} {m.l}</span> : null;
          })}
        </div>
        {user.prompts?.map((p, i) => (
          <div key={i} className="mt-3 ps-card p-3 bg-white/5">
            <p className="text-xs text-white/50">{p.q}</p>
            <p className="text-sm mt-1">{p.a}</p>
          </div>
        ))}
      </div>

      <Link to="/app/necesito-apoyo" data-testid="necesito-apoyo-link" className="mt-4 block ps-card p-4 hover:bg-[#22252E] transition">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,107,94,0.25), rgba(139,92,246,0.25))" }}>
            <HeartHandshake className="text-[#FF6B5E]"/>
          </div>
          <div className="flex-1">
            <p className="font-display font-bold">Necesito apoyo</p>
            <p className="text-xs text-white/60">Respiración, mis razones y teléfonos de ayuda</p>
          </div>
        </div>
      </Link>

      <div className="mt-4 space-y-2">
        <Link to="/app/perfil/editar" data-testid="edit-profile-link" className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10">
          <Pencil size={18}/><span className="font-semibold">Editar perfil</span>
        </Link>
        {user.role === "admin" && (
          <Link to="/admin" data-testid="admin-link" className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10">
            <Settings size={18}/><span className="font-semibold">Panel admin</span>
          </Link>
        )}
        <a href="https://sinadicciones.org" target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10">
          <ExternalLink size={18}/><span className="font-semibold">Orientación en SinAdicciones.org</span>
        </a>
        <button data-testid="logout-btn" onClick={async ()=>{await logout(); nav("/");}} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10">
          <LogOut size={18}/><span className="font-semibold">Cerrar sesión</span>
        </button>
        <button data-testid="delete-account-btn" onClick={delAccount} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300">
          <Trash2 size={18}/><span className="font-semibold">Eliminar cuenta</span>
        </button>
      </div>
    </div>
  );
}
