import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { detectLocation } from "@/lib/geo";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MapPin, Sparkles } from "lucide-react";

export default function Waitlist() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("OTHER");
  const [city, setCity] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    detectLocation().then((loc) => {
      if (loc?.country) setCountry(loc.country);
      if (loc?.city) setCity(loc.city);
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await api.post("/waitlist", { email: email.trim(), country, city: city || null });
      setDone(true);
    } catch {
      toast.error("No pudimos guardar tu correo. Intenta de nuevo en un rato.");
    } finally { setSending(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-[#0E0F13]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="ps-card w-full max-w-md p-7 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full ps-gradient opacity-25 blur-3xl"/>
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl ps-gradient flex items-center justify-center mb-4">
            <MapPin size={26}/>
          </div>
          <h1 className="font-display text-3xl font-black">Aún no llegamos a tu ciudad</h1>
          <p className="mt-3 text-white/70 text-sm leading-relaxed">
            PlanSobrio nació en Chile 🇨🇱 y por ahora la comunidad está creciendo acá.
            Déjanos tu correo y te avisamos apenas abramos en tu país.
          </p>

          {done ? (
            <div className="mt-6 ps-card p-5 border border-[#4ADE80]/30 text-center">
              <Sparkles className="mx-auto mb-2 text-[#4ADE80]" size={28}/>
              <p className="font-display text-lg font-bold">¡Gracias! Te avisaremos</p>
              <p className="text-sm text-white/60 mt-1">Mientras tanto puedes leernos en sinadicciones.org.</p>
              <Link to="/" className="ps-btn-secondary mt-5 inline-block">Volver al inicio</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                data-testid="waitlist-email"
                type="email" required placeholder="tu@correo.cl"
                className="ps-input" value={email} onChange={(e)=>setEmail(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  data-testid="waitlist-country"
                  placeholder="País (ISO2)"
                  className="ps-input" value={country} onChange={(e)=>setCountry(e.target.value.toUpperCase())} maxLength={4}
                />
                <input
                  data-testid="waitlist-city"
                  placeholder="Ciudad (opcional)"
                  className="ps-input" value={city} onChange={(e)=>setCity(e.target.value)}
                />
              </div>
              <button data-testid="waitlist-submit" disabled={sending} className="ps-btn-primary w-full">
                {sending ? "Guardando…" : "Avísenme cuando llegue"}
              </button>
              <button type="button" onClick={()=>nav(-1)} className="w-full text-white/50 text-sm hover:text-white/80">
                Volver
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
