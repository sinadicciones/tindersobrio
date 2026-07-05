import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { toast } from "sonner";
import { MessageCircle, Heart, Sparkles, X, CalendarDays } from "lucide-react";
import { Icon, iconForActivity } from "@/lib/icons";

export default function Chats() {
  const nav = useNavigate();
  const [tab, setTab] = useState("chats"); // 'chats' | 'likes'
  const [matches, setMatches] = useState([]);
  const [likes, setLikes] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
  const [activities, setActivities] = useState([]);
  const [planFor, setPlanFor] = useState(null); // { like, defaultActivityId }

  const reload = () => {
    api.get("/matches").then((r) => setMatches(r.data));
    api.get("/likes-received").then((r) => { setLikes(r.data); setLikesCount(r.data.filter((l)=>!l.seen).length); });
  };

  useEffect(() => {
    reload();
    api.get("/activities").then((r) => setActivities(r.data));
    api.post("/notifications/seen-matches").catch(() => { /* ignore */ });
  }, []);

  const openLikesTab = async () => {
    setTab("likes");
    try { await api.post("/likes-received/seen"); setLikesCount(0); } catch { /* ignore */ }
  };

  const passLike = async (like) => {
    try {
      await api.post("/like", {
        target_user_id: like.profile.id,
        mode: like.mode,
        kind: "pass",
      });
      setLikes((prev) => prev.filter((l) => l.id !== like.id));
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  const openArmarPlan = (like) => {
    setPlanFor({ like, activity_id: like.proposed_activity?.id || "" });
  };

  const submitPlan = async () => {
    if (!planFor) return;
    const { like, activity_id } = planFor;
    try {
      const res = await api.post("/like", {
        target_user_id: like.profile.id,
        mode: like.mode,
        activity_id: activity_id || null,
        no_plan: !activity_id,
        kind: "like",
      });
      setPlanFor(null);
      if (res.data.match) {
        toast.success("¡Hay match!");
        nav(`/app/chats/${res.data.match_id}`);
      } else {
        reload();
      }
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  const closePlan = () => setPlanFor(null);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="font-display text-[20px] font-black">Chats</h1>
      <p className="text-[#C7CBD6] text-sm mt-1">Tus matches y quienes te han dado me tinca.</p>

      {/* Segmented control */}
      <div className="mt-5 grid grid-cols-2 gap-1 p-1 rounded-full bg-white/5 border border-white/[.16]">
        <button
          data-testid="tab-chats"
          onClick={()=>setTab("chats")}
          className={`py-1.5 rounded-full text-xs font-bold transition inline-flex items-center justify-center gap-1.5 ${tab==="chats" ? "ps-gradient text-white" : "text-[#C7CBD6]"}`}>
          <MessageCircle size={13} strokeWidth={1.9}/> Chats
        </button>
        <button
          data-testid="tab-likes"
          onClick={openLikesTab}
          className={`py-1.5 rounded-full text-xs font-bold transition inline-flex items-center justify-center gap-1.5 relative ${tab==="likes" ? "ps-gradient text-white" : "text-[#C7CBD6]"}`}>
          <Sparkles size={13} strokeWidth={1.9}/> Les tincas{likesCount > 0 && <span data-testid="likes-badge"> · {likesCount}</span>}
        </button>
      </div>

      {tab === "chats" && (
        <div className="mt-5 space-y-1">
          {matches.length === 0 && (
            <div className="ps-card p-6 text-center">
              <MessageCircle size={28} className="mx-auto text-[#8E93A3]" strokeWidth={1.9}/>
              <p className="mt-3 text-[#C7CBD6]">Aún no tienes matches.</p>
              <p className="text-xs text-[#8E93A3] mt-1">Ve a Descubrir y dile a alguien &ldquo;me tinca&rdquo;</p>
            </div>
          )}
          {matches.map((m) => {
            const proposedAct = m.confirmed_activity || Object.values(m.proposals || {}).find(Boolean);
            const iconName = iconForActivity(proposedAct);
            return (
              <Link key={m.id} data-testid={`chat-${m.id}`} to={`/app/chats/${m.id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition">
                <div className="relative">
                  <Avatar user={m.other} size={46}/>
                  {m.unread > 0 && (
                    <span data-testid={`chat-unread-${m.id}`} className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full ps-gradient text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0B0C10]">
                      {m.unread > 9 ? "9+" : m.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[14px] font-black text-white truncate">{m.other?.alias}</p>
                  <p className={`text-[12px] truncate ${m.unread > 0 ? "text-white" : "text-[#C7CBD6]"}`}>
                    {m.last_message?.text || "Nuevo match — di hola"}
                  </p>
                  {proposedAct && (
                    <p className="mt-0.5 text-[11px] text-[#8E93A3] inline-flex items-center gap-1">
                      <Icon name={iconName} size={11} strokeWidth={1.9}/>
                      {m.plan_status === "confirmed" ? "Plan confirmado" : `${proposedAct.name} · falta la fecha`}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {tab === "likes" && (
        <div data-testid="likes-list" className="mt-5 space-y-3 pb-24">
          <p className="ps-lab"><Sparkles size={12} strokeWidth={1.9}/> Te dieron me tinca</p>
          {likes.length === 0 && (
            <div className="ps-card p-6 text-center">
              <Sparkles size={28} className="mx-auto text-[#8E93A3]" strokeWidth={1.9}/>
              <p className="mt-3 text-[#C7CBD6]">Cuando alguien te dé me tinca, aparecerá aquí</p>
            </div>
          )}
          {likes.map((l) => (
            <div key={l.id} data-testid={`like-${l.id}`} className="ps-card p-4">
              <div className="flex items-center gap-3">
                <Link to={`/app/usuario/${l.profile.id}`} className="shrink-0">
                  <Avatar user={l.profile} size={46}/>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/app/usuario/${l.profile.id}`} className="hover:opacity-90">
                    <p className="font-display text-[14px] font-black text-white">
                      {l.profile.alias}
                      {l.profile.age != null && <span className="text-[#C7CBD6] font-medium">, {l.profile.age}</span>}
                    </p>
                  </Link>
                  {l.proposed_activity ? (
                    <p className="mt-0.5 text-[12px] text-[#C7CBD6] inline-flex items-center gap-1">
                      Le tinca <Icon name={iconForActivity(l.proposed_activity)} size={12} strokeWidth={1.9}/> ir a {l.proposed_activity.name.toLowerCase()} contigo
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[12px] text-[#8E93A3]">Aún no propuso un plan — decide tú</p>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button data-testid={`like-armar-${l.id}`} onClick={()=>openArmarPlan(l)} className="ps-btn-primary py-2.5 text-sm">
                  Armar plan
                </button>
                <button data-testid={`like-pasar-${l.id}`} onClick={()=>passLike(l)} className="ps-btn-secondary py-2.5 text-sm">
                  Pasar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {planFor && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={closePlan}>
          <div className="ps-card w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <Avatar user={planFor.like.profile} size={44}/>
              <div>
                <h2 className="font-display text-xl font-black">¿Qué plan harías con {planFor.like.profile.alias}?</h2>
                {planFor.like.proposed_activity && (
                  <p className="text-xs text-[#C7CBD6] mt-0.5 inline-flex items-center gap-1">
                    Le tinca <Icon name={iconForActivity(planFor.like.proposed_activity)} size={12}/> {planFor.like.proposed_activity.name.toLowerCase()}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 max-h-[45vh] overflow-y-auto">
              {activities.map((a) => (
                <button key={a.id} data-testid={`pick-act-${a.id}`}
                  onClick={()=>setPlanFor((s)=>({ ...s, activity_id: a.id }))}
                  className={`px-2 py-3 rounded-2xl text-[11px] border text-center ${planFor.activity_id === a.id ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6]"}`}>
                  <div className="grid place-items-center"><Icon name={iconForActivity(a)} size={22}/></div>
                  <div className="mt-1 leading-tight">{a.name}</div>
                </button>
              ))}
            </div>
            <button data-testid="pick-no-plan" onClick={()=>setPlanFor((s)=>({ ...s, activity_id: "" }))}
              className={`mt-3 w-full py-2.5 rounded-full text-sm border ${!planFor.activity_id ? "ps-gradient border-transparent" : "bg-white/5 border-white/10 text-white/70"}`}>
              Solo me interesa (sin plan por ahora)
            </button>
            <div className="mt-5 flex gap-2">
              <button onClick={closePlan} className="ps-btn-secondary flex-1">Cancelar</button>
              <button data-testid="submit-armar-plan" onClick={submitPlan} className="ps-btn-primary flex-1">Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
