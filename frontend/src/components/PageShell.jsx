export default function PageShell({ children, className = "" }) {
  return (
    <div className={`min-h-screen bg-[#0E0F13] text-white ${className}`}>
      <div className="mx-auto w-full max-w-md pb-nav">{children}</div>
    </div>
  );
}
