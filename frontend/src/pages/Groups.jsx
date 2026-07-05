import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { Users, MapPin, Globe, Plus } from "lucide-react";
import { Icon, emojiToIconName } from "@/lib/icons";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [tab, setTab] = useState("explorar");
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/groups").then((r)=>{setGroups(r.data); setLoading(false);}); }, []);

  const filtered = tab === "mis" ? groups.filter((g)=>g.is_member) : groups;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="font-display text-[20px] font-black">Grupos</h1>
      <p className="text-[#C7CBD6] text-sm mt-1">Comunidades y actividades sobrias.</p>

      {/* Segmented control */}
      <div className="mt-5 grid grid-cols-2 gap-1 bg-white/5 rounded-full p-1 border border-white/[.16]">
        <button
          data-testid="tab-explorar"
          onClick={()=>setTab("explorar")}
          className={`py-1.5 rounded-full text-xs font-bold transition ${tab==="explorar" ? "ps-gradient text-white" : "text-[#C7CBD6]"}`}
        >Explorar</button>
        <button
          data-testid="tab-mis"
          onClick={()=>setTab("mis")}
          className={`py-1.5 rounded-full text-xs font-bold transition ${tab==="mis" ? "ps-gradient text-white" : "text-[#C7CBD6]"}`}
        >Mis grupos</button>
      </div>

      <div className="mt-5 space-y-3 pb-24">
        {loading ? (
          <div className="ps-card h-24 animate-pulse"/>
        ) : filtered.length === 0 ? (
          <div className="ps-card p-6 text-center text-[#C7CBD6]">
            {tab === "mis" ? "Aún no te has unido a ningún grupo." : "No hay grupos por ahora."}
          </div>
        ) : filtered.map((g) => {
          const iconName = emojiToIconName[g.emoji] || "Users";
          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Link to={`/app/grupos/${g.id}`} data-testid={`group-${g.id}`} className="ps-card p-3 flex items-center gap-3 hover:bg-[#22252E] transition">
                <div className="w-[52px] h-[52px] rounded-2xl grid place-items-center bg-white/[.09] border border-white/[.16] shrink-0">
                  <Icon name={iconName} size={22}/>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-[14.5px] font-black text-white truncate">{g.name}</h3>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[#C7CBD6]">
                    <span className="inline-flex items-center gap-1"><Users size={12} strokeWidth={1.9}/> {g.member_count}</span>
                    <span className="inline-flex items-center gap-1">
                      {g.is_online
                        ? <><Globe size={12} strokeWidth={1.9}/> Online</>
                        : <><MapPin size={12} strokeWidth={1.9}/> {g.comuna || ""}</>}
                    </span>
                  </div>
                </div>
                {g.is_member ? (
                  <span
                    data-testid={`group-member-${g.id}`}
                    className="text-[10.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{ color: "#4ADE80", background: "rgba(74,222,128,.14)", border: "1px solid rgba(74,222,128,.42)" }}
                  >
                    Miembro
                  </span>
                ) : (
                  <span data-testid={`group-join-${g.id}`} className="w-8 h-8 rounded-full grid place-items-center ps-gradient text-white">
                    <Plus size={16} strokeWidth={2.2}/>
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
