import { useEffect, useState } from "react";
import api from "@/lib/api";
import { CalendarHeart, CalendarDays, CheckCircle2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Icon, iconForActivity } from "@/lib/icons";

export default function MisPlanes() {
  const [plans, setPlans] = useState([]);
  useEffect(() => { api.get("/plans").then((r)=>setPlans(r.data)); }, []);

  const now = new Date();
  const upcoming = plans.filter((p) => new Date(p.when) >= now);
  const past = plans.filter((p) => new Date(p.when) < now);

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-24">
      <h1 className="font-display text-[20px] font-black">Mis planes</h1>
      <p className="text-[#C7CBD6] text-sm mt-1">Panoramas confirmados con matches.</p>

      <section className="mt-5">
        <p className="ps-lab"><CalendarDays size={12} strokeWidth={1.9}/> Próximos</p>
        {upcoming.length === 0 && (
          <div className="ps-card p-6 text-center">
            <CalendarHeart size={30} strokeWidth={1.6} className="mx-auto text-[#8E93A3]"/>
            <p className="mt-3 text-[#C7CBD6] text-sm">Aún no hay planes agendados.</p>
            <p className="mt-1 text-[11px] text-[#8E93A3]">Cuando confirmes uno con tu match aparecerá aquí.</p>
          </div>
        )}
        <div className="space-y-3">
          {upcoming.map((p) => <PlanCard key={p.id} p={p}/>)}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-6">
          <p className="ps-lab"><CalendarDays size={12} strokeWidth={1.9}/> Pasados</p>
          <div className="space-y-3 opacity-70">
            {past.map((p) => <PlanCard key={p.id} p={p}/>)}
          </div>
        </section>
      )}
    </div>
  );
}

function PlanCard({ p }) {
  const iconName = iconForActivity(p.activity);
  return (
    <div data-testid={`plan-${p.id}`} className="ps-card p-4">
      <div className="flex items-center gap-3">
        <span className="ps-icn"><Icon name={iconName} size={20}/></span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-black text-[15px] leading-tight text-white">{p.activity?.name}</p>
          {p.with && <p className="text-[12px] text-[#C7CBD6] mt-0.5">con <span className="text-white font-semibold">{p.with.alias}</span></p>}
        </div>
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ color: "#4ADE80", background: "rgba(74,222,128,.14)", border: "1px solid rgba(74,222,128,.42)" }}>
          <CheckCircle2 size={11} strokeWidth={1.9}/> Confirmado
        </span>
      </div>
      <p className="mt-3 text-[12px] text-[#C7CBD6] inline-flex items-center gap-1.5">
        <CalendarDays size={13} strokeWidth={1.9}/>
        {new Date(p.when).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}
      </p>
      {p.with && (
        <div className="mt-3 pt-3 border-t border-white/[.09] flex items-center gap-2">
          <Avatar user={p.with} size={30}/>
          <span className="text-[12px] text-[#C7CBD6]">con <span className="text-white font-semibold">{p.with.alias}</span></span>
        </div>
      )}
    </div>
  );
}
