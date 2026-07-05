import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Trash2, Send, Mail, Plus } from "lucide-react";

const TYPES = [
  { key: "admin_new_user", label: "Nuevo usuario" },
  { key: "admin_daily_summary", label: "Resumen diario" },
  { key: "admin_grave_report", label: "Reporte grave" },
];

export default function EmailsAdmin() {
  const [recipients, setRecipients] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [stats, setStats] = useState(null);
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const [r, s] = await Promise.all([
        api.get("/admin/email/recipients"),
        api.get("/admin/email/stats", { params: { days: 7 } }),
      ]);
      setRecipients(r.data);
      setStats(s.data);
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "Error cargando emails");
    }
  };

  useEffect(() => { load(); }, []);

  const addRecipient = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      await api.post("/admin/email/recipients", { email: newEmail.trim() });
      setNewEmail("");
      await load();
      toast.success("Destinatario agregado");
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "No se pudo agregar");
    }
  };

  const removeRecipient = async (email) => {
    if (!window.confirm(`¿Eliminar ${email} de las notificaciones?`)) return;
    try {
      await api.delete(`/admin/email/recipients/${encodeURIComponent(email)}`);
      await load();
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "No se pudo eliminar");
    }
  };

  const toggle = async (r, key) => {
    try {
      const next = { ...(r.active_for || {}), [key]: !r.active_for?.[key] };
      await api.post("/admin/email/recipients", { email: r.email, active_for: next });
      await load();
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "No se pudo actualizar");
    }
  };

  const sendDaily = async () => {
    setSending(true);
    try {
      const r = await api.post("/admin/email/send-daily-summary");
      const ok = (r.data?.results || []).filter((x) => x.ok).length;
      toast.success(`Resumen diario enviado a ${ok} destinatarios`);
      await load();
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "No se pudo enviar");
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="ps-lab mb-3"><Mail size={12} strokeWidth={2}/> Destinatarios internos</p>
        <div className="ps-card p-4 overflow-x-auto">
          <table className="w-full text-xs" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr className="text-white/50">
                <th className="text-left font-semibold pb-2">Email</th>
                {TYPES.map((t) => <th key={t.key} className="text-center font-semibold pb-2 px-2">{t.label}</th>)}
                <th className="pb-2"/>
              </tr>
            </thead>
            <tbody className="text-white">
              {recipients.map((r) => (
                <tr key={r.email} data-testid={`admin-recipient-${r.email}`} className="border-t border-white/[.08]">
                  <td className="py-2 pr-4 text-white/85 truncate max-w-[240px]">{r.email}</td>
                  {TYPES.map((t) => (
                    <td key={t.key} className="text-center py-2 px-2">
                      <input
                        type="checkbox"
                        data-testid={`toggle-${t.key}-${r.email}`}
                        checked={!!r.active_for?.[t.key]}
                        onChange={()=>toggle(r, t.key)}
                        className="w-4 h-4 accent-[#8B5CF6]"
                      />
                    </td>
                  ))}
                  <td className="py-2 text-right">
                    <button
                      onClick={()=>removeRecipient(r.email)}
                      className="text-white/40 hover:text-[#FF6B5E] transition"
                      data-testid={`remove-recipient-${r.email}`}
                    >
                      <Trash2 size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
              {recipients.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-white/50">Aún no hay destinatarios.</td></tr>
              )}
            </tbody>
          </table>
          <form onSubmit={addRecipient} className="mt-3 flex gap-2">
            <input
              data-testid="new-recipient-email"
              type="email"
              placeholder="agregar correo…"
              className="ps-input flex-1"
              value={newEmail}
              onChange={(e)=>setNewEmail(e.target.value)}
            />
            <button data-testid="add-recipient" type="submit" className="ps-btn-secondary inline-flex items-center gap-1"><Plus size={14}/> Agregar</button>
          </form>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="ps-lab"><Mail size={12} strokeWidth={2}/> Estadísticas (últimos 7 días)</p>
          <button
            data-testid="send-daily-now"
            disabled={sending}
            onClick={sendDaily}
            className="ps-btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <Send size={12}/> {sending ? "Enviando…" : "Enviar resumen diario ahora"}
          </button>
        </div>
        <div className="ps-card p-4 overflow-x-auto">
          <table className="w-full text-xs" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr className="text-white/50">
                <th className="text-left font-semibold pb-2">Tipo</th>
                <th className="text-right font-semibold pb-2">Enviados</th>
                <th className="text-right font-semibold pb-2">Rebotados</th>
                <th className="text-right font-semibold pb-2">Quejas</th>
                <th className="text-right font-semibold pb-2">Errores</th>
                <th className="text-right font-semibold pb-2">Cola</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {Object.entries(stats?.by_type || {}).map(([type, s]) => (
                <tr key={type} data-testid={`stat-row-${type}`} className="border-t border-white/[.08]">
                  <td className="py-2 pr-4 text-white/85">{type}</td>
                  <td className="py-2 text-right">{s.sent || 0}</td>
                  <td className="py-2 text-right">{s.bounced || 0}</td>
                  <td className="py-2 text-right">{s.complained || 0}</td>
                  <td className="py-2 text-right">{s.error || 0}</td>
                  <td className="py-2 text-right">{s.queued || 0}</td>
                </tr>
              ))}
              {Object.keys(stats?.by_type || {}).length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-white/50">Aún no hay envíos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
