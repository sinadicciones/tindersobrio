import { useState } from "react";
import { X } from "lucide-react";

// Curated emoji presets for PlanSobrio — sober lifestyle focus.
export const EMOJI_CATEGORIES = [
  {
    key: "sobrio",
    label: "Sobrio · Bienestar",
    emojis: ["☕", "🌱", "🧘", "🍵", "🍰", "💛", "✨", "🌸", "🍋", "🧉", "🌼", "🕯️"],
  },
  {
    key: "deporte",
    label: "Deporte",
    emojis: ["🏃", "🚴", "🏊", "🧗", "⚽", "🎾", "🏋️", "🤸", "🥾", "⛷️", "🏓", "🧘‍♀️"],
  },
  {
    key: "arte",
    label: "Arte · Cultura",
    emojis: ["🎨", "🎬", "🎭", "🎵", "📚", "🎲", "🎤", "🖌️", "🎹", "📖", "🎪", "🎼"],
  },
  {
    key: "naturaleza",
    label: "Naturaleza",
    emojis: ["🏔️", "🌊", "🌳", "🐶", "🌅", "🏕️", "🌺", "🌿", "🌵", "🍄", "☀️", "🌙"],
  },
  {
    key: "otros",
    label: "Otros",
    emojis: ["🎯", "🎁", "⭐", "💬", "🤝", "🎉", "🥳", "🍕", "🥗", "🎳", "🏛️", "🗺️"],
  },
];

export default function EmojiPicker({ value, onChange, "data-testid": testid }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState(EMOJI_CATEGORIES[0].key);
  const activeCat = EMOJI_CATEGORIES.find((c) => c.key === cat) || EMOJI_CATEGORIES[0];

  return (
    <>
      <button
        type="button"
        data-testid={testid || "emoji-picker-btn"}
        onClick={() => setOpen(true)}
        className="ps-input w-16 text-2xl flex items-center justify-center hover:bg-white/10 transition"
      >
        {value || "🙂"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="ps-card w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-black">Elegir emoji</h3>
              <button data-testid="emoji-picker-close" onClick={() => setOpen(false)} className="text-white/60 hover:text-white"><X size={18}/></button>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {EMOJI_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  data-testid={`emoji-cat-${c.key}`}
                  onClick={() => setCat(c.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${cat === c.key ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6]"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {activeCat.emojis.map((e) => (
                <button
                  key={e}
                  data-testid={`emoji-${e}`}
                  onClick={() => { onChange(e); setOpen(false); }}
                  className={`h-11 rounded-xl text-2xl grid place-items-center transition ${value === e ? "ps-gradient" : "bg-white/5 hover:bg-white/15"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
