import { useEffect, useState } from "react";
import api from "@/lib/api";
import { CalendarHeart, MapPin } from "lucide-react";
import Avatar from "@/components/Avatar";

export default function MisPlanes() {
  const [plans, setPlans] = useState([]);
  useEffect(() => { api.get("/plans").then((r)=>setPlans(r.data)); }, []);

  const now = new Date();
  const upcoming = plans.filter((p) => new Date(p.when) >= now);
  const past = plans.filter((p) => new Date(p.when) < now);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="font-display text-3xl font-black flex items-center gap-2"><CalendarHeart className="text-[#FF6B5E]"/> Mis planes</h1>
      <p className="text-white/60 mt-1">Panoramas confirmados con matches.</p>

      <section className="mt-5">
        <h2 className="text-sm text-white/50 uppercase tracking-wider mb-2">Próximos</h2>
        {upcoming.length === 0 && <p className="text-white/60 text-sm">Aún no hay planes agendados.</p>}
        <div className="space-y-3">
          {upcoming.map((p) => <PlanCard key={p.id} p={p}/>)}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm text-white/50 uppercase tracking-wider mb-2">Pasados</h2>
          <div className="space-y-3 opacity-70">
            {past.map((p) => <PlanCard key={p.id} p={p}/>)}
          </div>
        </section>
      )}
    </div>
  );
}

function PlanCard({ p }) {
  return (
    <div data-testid={`plan-${p.id}`} className="ps-card p-4">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{p.activity?.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-lg leading-tight">{p.activity?.name}</p>
          <p className="text-xs text-white/50 mt-1">{new Date(p.when).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}</p>
        </div>
      </div>
      {p.with && (
        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-white/5">
          <Avatar user={p.with} size={32}/>
          <span className="text-sm">con <span className="font-semibold">{p.with.alias}</span></span>
        </div>
      )}
    </div>
  );
}
