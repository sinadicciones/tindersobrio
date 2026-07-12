import { Sprout, ArrowRight } from "lucide-react";

const REGISTER_URL = "/registro";

export default function BlogCTA({ variant = "soft", title, text }) {
  if (variant === "strong") {
    return (
      <div
        data-testid="blog-cta-strong"
        className="my-10 rounded-[28px] p-8 sm:p-10 text-white shadow-2xl shadow-purple-500/25"
        style={{ background: "linear-gradient(135deg,#FF6B5E,#8B5CF6)" }}
      >
        <h3 className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-[1.15]">
          {title || "Conoce gente que vive sin alcohol ni drogas"}
        </h3>
        <p className="mt-3 opacity-90 leading-relaxed">
          {text || "Amistad, apoyo, grupos y amor — con el plan incluido. Gratis en beta, en Chile."}
        </p>
        <a
          href={REGISTER_URL}
          data-testid="blog-cta-strong-btn"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white text-[#0F172A] px-6 py-3 text-[15px] font-bold hover:bg-slate-50 transition"
        >
          Crear mi cuenta gratis <ArrowRight size={17} strokeWidth={2.4}/>
        </a>
        <p className="mt-3 text-[12px] opacity-80">Gratis en beta · Solo mayores de 18</p>
      </div>
    );
  }
  return (
    <div
      data-testid="blog-cta-soft"
      className="my-8 rounded-2xl border p-5 flex items-start gap-3"
      style={{ background: "#1D212B", borderColor: "rgba(255,255,255,0.12)" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(74,222,128,.18)" }}>
        <Sprout size={18} strokeWidth={2} className="text-[#4ADE80]"/>
      </div>
      <div className="flex-1 min-w-0">
        {title && <p className="font-display font-black text-white text-[15px] leading-tight">{title}</p>}
        {text && <p className="mt-1 text-[13.5px] text-slate-300 leading-relaxed">{text}</p>}
        <a
          href={REGISTER_URL}
          data-testid="blog-cta-soft-link"
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-[#4ADE80] hover:text-[#22C55E] transition"
        >
          Conocer PlanSobrio <ArrowRight size={13} strokeWidth={2.4}/>
        </a>
      </div>
    </div>
  );
}
