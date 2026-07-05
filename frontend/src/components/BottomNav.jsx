import { NavLink } from "react-router-dom";
import { Compass, Users, CalendarHeart, MessageCircle, User } from "lucide-react";

const items = [
  { to: "/app/descubrir", label: "Descubrir", icon: Compass, tid: "nav-descubrir" },
  { to: "/app/grupos", label: "Grupos", icon: Users, tid: "nav-grupos" },
  { to: "/app/mis-planes", label: "Mis planes", icon: CalendarHeart, tid: "nav-planes" },
  { to: "/app/chats", label: "Chats", icon: MessageCircle, tid: "nav-chats" },
  { to: "/app/perfil", label: "Perfil", icon: User, tid: "nav-perfil" },
];

export default function BottomNav() {
  return (
    <nav
      data-testid="bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-md mx-3 mb-3 rounded-3xl bg-[#12141A]/95 backdrop-blur-xl border border-white/10 shadow-2xl px-2 py-2 flex justify-between">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            data-testid={it.tid}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-2xl text-[10px] font-semibold transition-all ${
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
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
