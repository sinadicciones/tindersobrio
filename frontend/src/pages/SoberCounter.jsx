import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Sprout, Award, Calendar as CalendarIcon, RotateCcw, PauseCircle, Save, Info } from "lucide-react";

export default function SoberCounter() {
  const nav = useNavigate();
  const [counter, setCounter] = useState(null);
  const [editingDate, setEditingDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get("/sober-counter")
      .then((r) => { setCounter(r.data); setEditingDate(r.data?.start_date || todayIso()); })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const start = async (date) => {
    setSaving(true);
    try {
      const { data } = await api.post("/sober-counter/start", { start_date: date || null });
      setCounter(data);
      toast.success("¡Contador activo! Un día a la vez 🌱");
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const updateDate = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/sober-counter/date", { start_date: editingDate });
      setCounter(data);
      toast.success("Fecha actualizada");
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const reset = async () => {
    if (!window.confirm("¿Reiniciar el contador desde hoy? Cada intento cuenta.")) return;
    setSaving(true);
    try {
      const { data } = await api.post("/sober-counter/reset");
      setCounter(data);
      setEditingDate(data.start_date);
      toast.success("Empezar de nuevo hoy 🌱");
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const stop = async () => {
    if (!window.confirm("¿Desactivar el contador? Puedes volver a activarlo cuando quieras.")) return;
    setSaving(true);
    try {
      await api.post("/sober-counter/stop");
      setCounter({ active: false });
      toast.success("Contador pausado");
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-white/60">Cargando…</div>;

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-24">
      <button onClick={() => nav(-1)} data-testid="counter-back" className="flex items-center gap-1 text-white/70 mb-4">
        <ArrowLeft size={18}/> Volver
      </button>

      <h1 className="font-display text-3xl font-black tracking-tight mb-1">Contador de días</h1>
      <p className="text-sm text-white/60 mb-6">
        Privado. Solo tú lo ves. Sin diagnóstico, sin juicios — solo un pequeño reconocimiento a tu proceso.
      </p>

      {!counter?.active ? (
        <StartCard onStart={start} saving={saving}/>
      ) : (
        <ActiveState counter={counter} editingDate={editingDate} setEditingDate={setEditingDate}
          onUpdate={updateDate} onReset={reset} onStop={stop} saving={saving}/>
      )}

      <div className="mt-8 ps-card p-4">
        <p className="text-xs text-white/50 flex items-start gap-2">
          <Info size={13} strokeWidth={1.9} className="shrink-0 mt-0.5"/>
          <span>
            El contador es información personal y motivacional. No aparece en tu perfil público.
            Si buscas ayuda profesional, entra a <a href="https://sinadicciones.org" target="_blank" rel="noreferrer" className="text-[#8B5CF6] hover:underline">SinAdicciones.org</a>.
          </span>
        </p>
      </div>
    </div>
  );
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function StartCard({ onStart, saving }) {
  const [date, setDate] = useState(todayIso());
  return (
    <div className="ps-card p-6" data-testid="counter-start-card">
      <div className="w-16 h-16 rounded-3xl bg-[#4ADE80]/15 border border-[#4ADE80]/30 grid place-items-center mb-4">
        <Sprout size={30} strokeWidth={2} className="text-[#4ADE80]"/>
      </div>
      <h2 className="font-display text-xl font-black mb-2">Empieza tu contador</h2>
      <p className="text-sm text-white/70 leading-relaxed mb-5">
        Puedes usar hoy como punto de partida, o una fecha anterior si quieres reflejar tu tiempo real sin consumo.
      </p>
      <label className="text-xs text-white/60 mb-1.5 block">Fecha de inicio</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        max={todayIso()}
        data-testid="counter-start-date-input"
        className="ps-input mb-4"
      />
      <button
        onClick={() => onStart(date)}
        disabled={saving}
        data-testid="counter-start-btn"
        className="ps-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Sprout size={16} strokeWidth={2.2}/> {saving ? "Activando…" : "Activar contador"}
      </button>
    </div>
  );
}

function ActiveState({ counter, editingDate, setEditingDate, onUpdate, onReset, onStop, saving }) {
  const { days, next_milestone, milestones_reached = [] } = counter;
  const daysToNext = Math.max(0, next_milestone - days);
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[#4ADE80]/40 bg-gradient-to-br from-[#4ADE80]/15 to-[#22C55E]/5 p-6" data-testid="counter-active-card">
        <div className="flex items-center gap-2 mb-3">
          <Sprout size={20} strokeWidth={2.2} className="text-[#4ADE80]"/>
          <p className="text-[10px] uppercase tracking-wider text-[#4ADE80] font-bold">Llevas</p>
        </div>
        <p className="font-display text-6xl font-black leading-none">
          <span data-testid="counter-days-big" className="text-[#4ADE80]">{days}</span>
          <span className="text-white/50 text-2xl ml-3 font-bold">día{days === 1 ? "" : "s"}</span>
        </p>
        <p className="text-base text-white/80 mt-3">construyendo tu nueva vida 🌱</p>

        <div className="mt-5 pt-5 border-t border-white/10">
          <p className="text-xs text-white/60 flex items-center gap-1.5 mb-1">
            <Award size={12} strokeWidth={2} className="text-[#FBBF24]"/> Próximo hito
          </p>
          <p className="font-display text-lg font-black" data-testid="counter-next-detail">
            {daysToNext === 0 ? "¡Hoy es un hito!" : `${next_milestone} días · faltan ${daysToNext}`}
          </p>
        </div>

        {milestones_reached.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/60 mb-2">Hitos alcanzados</p>
            <div className="flex flex-wrap gap-1.5" data-testid="counter-milestones-reached">
              {milestones_reached.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBBF24]/15 border border-[#FBBF24]/30 text-[#FBBF24] text-[11px] font-bold">
                  <Award size={10} strokeWidth={2.4}/> {m} días
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ps-card p-5">
        <p className="ps-lab mb-3"><CalendarIcon size={12} strokeWidth={1.9}/> Editar fecha de inicio</p>
        <div className="flex gap-2 items-end">
          <input
            type="date"
            value={editingDate}
            onChange={(e) => setEditingDate(e.target.value)}
            max={todayIso()}
            data-testid="counter-edit-date"
            className="ps-input flex-1"
          />
          <button
            onClick={onUpdate}
            disabled={saving || editingDate === counter.start_date}
            data-testid="counter-save-date"
            className="ps-btn-primary inline-flex items-center gap-1.5 px-4 disabled:opacity-50"
          >
            <Save size={14} strokeWidth={2.2}/> Guardar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onReset}
          disabled={saving}
          data-testid="counter-reset-btn"
          className="rounded-2xl p-4 border border-white/[.12] bg-white/[.03] hover:bg-white/[.06] transition disabled:opacity-50 text-left"
        >
          <RotateCcw size={18} strokeWidth={2} className="text-[#FBBF24] mb-2"/>
          <p className="font-display font-black text-[13px]">Empezar de nuevo</p>
          <p className="text-[11px] text-white/50 mt-1 leading-tight">Cada intento cuenta.</p>
        </button>
        <button
          onClick={onStop}
          disabled={saving}
          data-testid="counter-stop-btn"
          className="rounded-2xl p-4 border border-white/[.12] bg-white/[.03] hover:bg-white/[.06] transition disabled:opacity-50 text-left"
        >
          <PauseCircle size={18} strokeWidth={2} className="text-white/60 mb-2"/>
          <p className="font-display font-black text-[13px]">Desactivar</p>
          <p className="text-[11px] text-white/50 mt-1 leading-tight">Pausa cuando quieras.</p>
        </button>
      </div>
    </div>
  );
}
