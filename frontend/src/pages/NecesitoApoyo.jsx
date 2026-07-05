import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Phone, ExternalLink, Trash2, Plus } from "lucide-react";

export default function NecesitoApoyo() {
  const nav = useNavigate();
  const [reasons, setReasons] = useState([]);
  const [text, setText] = useState("");

  const load = () => api.get("/reasons").then((r)=>setReasons(r.data));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!text.trim()) return;
    try { await api.post("/reasons", { text }); setText(""); await load(); }
    catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };
  const del = async (id) => { await api.delete(`/reasons/${id}`); await load(); };

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <button onClick={()=>nav(-1)} className="flex items-center gap-1 text-white/70 mb-3"><ArrowLeft size={18}/> Volver</button>
      <h1 className="font-display text-3xl font-black">Necesito apoyo</h1>
      <p className="text-white/60 mt-2">Un lugar tranquilo para respirar, recordar tus razones y pedir ayuda.</p>

      {/* Breathing */}
      <section className="mt-6 ps-card p-6 relative overflow-hidden">
        <p className="text-xs uppercase tracking-wider text-white/50">Respiración guiada</p>
        <p className="text-sm mt-1 text-white/70">4s inhala · 4s mantén · 6s exhala. Cierra los ojos si quieres.</p>
        <BreathingCircle/>
      </section>

      {/* Mis razones */}
      <section className="mt-5 ps-card p-5">
        <h2 className="font-display text-xl font-bold">Mis razones</h2>
        <p className="text-sm text-white/60 mt-1">Escribe frases personales de por qué vives sin consumo. Vuelve a leerlas cuando lo necesites.</p>
        <div className="mt-3 flex gap-2">
          <input data-testid="reason-input" className="ps-input flex-1" placeholder="Ej: quiero verme crecer con calma." value={text} onChange={(e)=>setText(e.target.value)}/>
          <button data-testid="reason-add" onClick={add} className="ps-btn-primary px-4"><Plus size={16}/></button>
        </div>
        <div className="mt-4 space-y-2">
          {reasons.map((r) => (
            <div key={r.id} className="flex items-start gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/10">
              <p className="flex-1 text-sm">💛 {r.text}</p>
              <button data-testid={`reason-del-${r.id}`} onClick={()=>del(r.id)} className="text-white/40 hover:text-white"><Trash2 size={14}/></button>
            </div>
          ))}
          {reasons.length === 0 && <p className="text-xs text-white/40">Aún no has escrito ninguna. Empieza por una pequeña 🌱</p>}
        </div>
      </section>

      {/* Telefonos */}
      <section className="mt-5 space-y-2">
        <h2 className="font-display text-xl font-bold">Teléfonos de ayuda en Chile</h2>
        <a data-testid="tel-salud" href="tel:6003607777" className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#38BDF8]/15 border border-[#38BDF8]/40 hover:bg-[#38BDF8]/25 transition">
          <Phone className="text-[#38BDF8]"/><div className="flex-1"><p className="font-display font-bold">Salud Responde</p><p className="text-sm text-white/70">600 360 7777</p></div>
        </a>
        <a data-testid="tel-suicidio" href="tel:*4141" className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#FBBF24]/15 border border-[#FBBF24]/40 hover:bg-[#FBBF24]/25 transition">
          <Phone className="text-[#FBBF24]"/><div className="flex-1"><p className="font-display font-bold">Prevención del suicidio</p><p className="text-sm text-white/70">*4141</p></div>
        </a>
        <a data-testid="tel-urgencias" href="tel:131" className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#FF6B5E]/15 border border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/25 transition">
          <Phone className="text-[#FF6B5E]"/><div className="flex-1"><p className="font-display font-bold">Urgencias</p><p className="text-sm text-white/70">131</p></div>
        </a>
        <a data-testid="link-sinadicciones" href="https://sinadicciones.org" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
          <ExternalLink className="text-white/70"/><div className="flex-1"><p className="font-display font-bold">Orientación profesional</p><p className="text-sm text-white/70">SinAdicciones.org</p></div>
        </a>
      </section>

      <p className="mt-6 text-xs text-white/40 text-center">PlanSobrio no reemplaza tratamiento profesional ni atención de urgencia.</p>
    </div>
  );
}

function BreathingCircle() {
  // 4-4-6 pattern, cycle 14s
  return (
    <div className="mt-4 flex flex-col items-center py-4">
      <div className="relative w-52 h-52 flex items-center justify-center">
        <motion.div
          className="absolute w-full h-full rounded-full"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.4), rgba(139,92,246,0.15) 70%, transparent)" }}
          animate={{ scale: [0.7, 1.15, 1.15, 0.7], opacity: [0.6, 1, 1, 0.6] }}
          transition={{ duration: 14, ease: "easeInOut", repeat: Infinity, times: [0, 0.286, 0.571, 1] }}
        />
        <motion.div
          className="w-32 h-32 rounded-full ps-gradient"
          animate={{ scale: [0.85, 1.1, 1.1, 0.85] }}
          transition={{ duration: 14, ease: "easeInOut", repeat: Infinity, times: [0, 0.286, 0.571, 1] }}
        />
        <motion.p
          className="absolute font-display font-black text-lg"
          animate={{ opacity: [1, 1, 1, 1] }}
        >
          <motion.span
            animate={{ opacity: [0, 1, 0, 0, 0], }}
            transition={{ duration: 14, repeat: Infinity, times: [0, 0.14, 0.286, 0.6, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >Inhala</motion.span>
          <motion.span
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{ duration: 14, repeat: Infinity, times: [0, 0.286, 0.32, 0.571, 0.6] }}
            className="absolute inset-0 flex items-center justify-center"
          >Mantén</motion.span>
          <motion.span
            animate={{ opacity: [0, 0, 0, 1, 0] }}
            transition={{ duration: 14, repeat: Infinity, times: [0, 0.571, 0.6, 0.9, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >Exhala</motion.span>
          <span className="opacity-0">Mantén</span>
        </motion.p>
      </div>
      <p className="text-xs text-white/40 mt-4">Repite por 2 minutos.</p>
    </div>
  );
}
