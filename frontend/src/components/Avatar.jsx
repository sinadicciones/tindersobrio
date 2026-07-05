import { fileUrl } from "@/lib/api";

export default function Avatar({ user, size = 48, className = "" }) {
  const photo = user?.photos?.[0];
  const url = photo ? fileUrl(photo) : null;
  const initial = (user?.alias || "?").slice(0, 1).toUpperCase();
  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: "linear-gradient(135deg, #FF6B5E 0%, #8B5CF6 100%)" }}
    >
      {url ? (
        <img src={url} alt={user?.alias || "avatar"} className="w-full h-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.4, fontWeight: 800, fontFamily: "Outfit" }}>{initial}</span>
      )}
    </div>
  );
}
