import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [tab, setTab] = useState("explorar");
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/groups").then((r)=>{setGroups(r.data); setLoading(false);}); }, []);

  const filtered = tab === "mis" ? groups.filter((g)=>g.is_member) : groups;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="font-display text-3xl font-black">Grupos</h1>
      <p className="text-white/60 mt-1">Comunidades y actividades sobrias.</p>

      <div className="mt-5 grid grid-cols-2 gap-2 bg-white/5 rounded-full p-1">
        <button data-testid="tab-explorar" onClick={()=>setTab("explorar")} className={`py-2 rounded-full text-sm font-semibold transition ${tab==="explorar" ? "ps-gradient" : "text-white/70"}`}>Explorar</button>
        <button data-testid="tab-mis" onClick={()=>setTab("mis")} className={`py-2 rounded-full text-sm font-semibold transition ${tab==="mis" ? "ps-gradient" : "text-white/70"}`}>Mis grupos</button>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="ps-card h-40 animate-pulse"/>
        ) : filtered.length === 0 ? (
          <div className="ps-card p-6 text-center text-white/60">
            {tab === "mis" ? "Aún no te has unido a ningún grupo." : "No hay grupos por ahora."}
          </div>
        ) : filtered.map((g) => (
          <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Link to={`/app/grupos/${g.id}`} data-testid={`group-${g.id}`} className="block ps-card p-5 hover:bg-[#22252E] transition">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  {g.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg font-bold">{g.name}</h3>
                    {g.is_member && <span className="ps-chip text-xs" style={{ background: "rgba(74,222,128,0.15)", color: "#4ADE80", borderColor: "rgba(74,222,128,0.4)" }}>Miembro</span>}
                  </div>
                  <p className="text-sm text-white/60 line-clamp-2 mt-1">{g.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-white/50">
                    <span className="flex items-center gap-1"><Users size={13}/> {g.member_count}</span>
                    <span>{g.is_online ? "🌐 Online" : `📍 ${g.comuna || ""}`}</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
