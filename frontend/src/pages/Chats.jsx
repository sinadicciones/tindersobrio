import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Avatar from "@/components/Avatar";
import { MessageCircle } from "lucide-react";

export default function Chats() {
  const [matches, setMatches] = useState([]);
  useEffect(() => { api.get("/matches").then((r)=>setMatches(r.data)); }, []);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="font-display text-3xl font-black">Chats</h1>
      <p className="text-white/60 mt-1">Tus matches y conversaciones.</p>

      <div className="mt-5 space-y-2">
        {matches.length === 0 && (
          <div className="ps-card p-6 text-center">
            <MessageCircle size={30} className="mx-auto text-white/40"/>
            <p className="mt-3 text-white/70">Aún no tienes matches.</p>
            <p className="text-xs text-white/50 mt-1">Ve a Descubrir y dile a alguien &ldquo;me tinca ✨&rdquo;</p>
          </div>
        )}
        {matches.map((m) => (
          <Link key={m.id} data-testid={`chat-${m.id}`} to={`/app/chats/${m.id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition">
            <Avatar user={m.other} size={54}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-display font-bold">{m.other?.alias}</p>
                <span className="text-[10px] uppercase tracking-wider text-white/40">{m.mode}</span>
              </div>
              <p className="text-sm text-white/60 truncate">{m.last_message?.text || "Nuevo match — di hola 👋"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
