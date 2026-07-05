import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Compass, Users, CalendarHeart, MessageCircle, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

const items = [
  { to: "/app/descubrir", label: "Descubrir", icon: Compass, tid: "nav-descubrir" },
  { to: "/app/grupos", label: "Grupos", icon: Users, tid: "nav-grupos" },
  { to: "/app/mis-planes", label: "Mis planes", icon: CalendarHeart, tid: "nav-planes" },
  { to: "/app/chats", label: "Chats", icon: MessageCircle, tid: "nav-chats", key: "chats" },
  { to: "/app/perfil", label: "Perfil", icon: User, tid: "nav-perfil" },
];

export default function BottomNav() {
  const [counts, setCounts] = useState({ total: 0, new_matches: 0, unread_messages: 0 });
  const prev = useRef({ new_matches: 0, unread_messages: 0, first: true });
  const location = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get("/notifications/counts");
        if (cancelled) return;
        // Toast when new item arrives (but not on first load, and not when user is in chats screen)
        const inChats = location.pathname.startsWith("/app/chats");
        if (!prev.current.first && !inChats) {
          if (data.new_matches > prev.current.new_matches) {
            toast.success("¡Hay plan! 🎉 Tienes un nuevo match", {
              action: { label: "Ver", onClick: () => nav("/app/chats") },
              duration: 6000,
            });
          } else if (data.unread_messages > prev.current.unread_messages) {
            toast("💬 Nuevo mensaje en tu chat", {
              action: { label: "Ver", onClick: () => nav("/app/chats") },
              duration: 5000,
            });
          }
        }
        prev.current = { new_matches: data.new_matches, unread_messages: data.unread_messages, first: false };
        setCounts(data);
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [location.pathname, nav]);

  const chatBadge = counts.new_matches + counts.unread_messages;

  return (
    <nav
      data-testid="bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-md mx-3 mb-3 rounded-3xl bg-[#12141A]/95 backdrop-blur-xl border border-white/10 shadow-2xl px-2 py-2 flex justify-between">
        {items.map((it) => {
          const showBadge = it.key === "chats" && chatBadge > 0;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              data-testid={it.tid}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-2xl text-[10px] font-semibold transition-all ${
                  isActive
                    ? "text-white bg-gradient-to-br from-[#FF6B5E]/20 to-[#8B5CF6]/20"
                    : "text-white/50 hover:text-white/80"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <it.icon size={22} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? "text-[#FF6B5E]" : ""} />
                  <span className="mt-1">{it.label}</span>
                  {showBadge && (
                    <span data-testid="chats-badge" className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full ps-gradient text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#12141A]">
                      {chatBadge > 9 ? "9+" : chatBadge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
