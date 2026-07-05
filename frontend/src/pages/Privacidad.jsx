import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";

export default function Privacidad() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-[#0E0F13] text-white">
      <div className="mx-auto max-w-2xl px-6 pt-10 pb-16">
        <button onClick={()=>nav(-1)} className="flex items-center gap-1 text-white/60 mb-5"><ArrowLeft size={18}/> Volver</button>
        <h1 className="font-display text-4xl font-black tracking-tight">Política de privacidad</h1>
        <p className="text-white/50 text-sm mt-1">Última actualización: febrero de 2026</p>

        <div className="mt-8 space-y-6 text-white/80 leading-relaxed">
          <section className="ps-card p-5 border border-[#4ADE80]/30 bg-[#4ADE80]/5">
            <div className="flex items-center gap-2 text-[#4ADE80]"><Lock size={16}/> <p className="font-bold text-sm">Lo más importante primero</p></div>
            <p className="mt-2 text-sm">
              Tu <strong>relación con el consumo</strong> (respuesta del paso &ldquo;Tu proceso&rdquo; del onboarding) y tu <strong>tiempo sin consumo</strong> son datos PRIVADOS. Nunca aparecen en tu perfil público. Solo se muestra tu insignia de tiempo si tú la activas explícitamente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Qué datos guardamos</h2>
            <ul className="mt-2 text-sm space-y-1 list-disc list-inside marker:text-[#8B5CF6]">
              <li><strong>Cuenta:</strong> correo electrónico y contraseña (hash), fecha de nacimiento.</li>
              <li><strong>Perfil público:</strong> alias, comuna, género, fotos, frases, panoramas favoritos, modos activos.</li>
              <li><strong>Datos privados:</strong> relación con el consumo, tiempo sin consumo, tus razones.</li>
              <li><strong>Actividad:</strong> me tinca / pasar, matches, mensajes, participación en grupos y eventos.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Qué se muestra en tu perfil público</h2>
            <p className="mt-2 text-sm">Alias, edad, comuna, fotos, frases, actividades favoritas, y — solo si tú lo activas — tu insignia de tiempo sin consumo.</p>
            <p className="mt-2 text-sm text-white/60">Nunca se muestran: tu correo, tu fecha de nacimiento exacta, tu contraseña, ni tu relación con el consumo.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Sin analytics ni píxeles de terceros</h2>
            <p className="mt-2 text-sm">No integramos SDKs de analytics (Google, Meta, etc.) ni píxeles de rastreo. Tus datos no se venden ni se comparten con terceros con fines publicitarios.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Bloquear, reportar y eliminar</h2>
            <ul className="mt-2 text-sm space-y-1 list-disc list-inside marker:text-[#FF6B5E]">
              <li>Puedes bloquear a alguien: dejan de verse en descubrir, matches y grupos.</li>
              <li>Puedes reportar: el equipo revisa cada caso.</li>
              <li>Puedes <strong>eliminar tu cuenta</strong> en cualquier momento desde tu perfil. Borramos tu perfil, fotos, matches, chats, planes y membresías.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Seguridad</h2>
            <p className="mt-2 text-sm">Guardamos las contraseñas con hash (bcrypt). Las conexiones son cifradas (HTTPS). Los archivos de tus fotos requieren sesión iniciada para descargarse.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Tus derechos</h2>
            <p className="mt-2 text-sm">Puedes solicitar acceso, corrección o eliminación de tus datos escribiendo a <a href="mailto:contacto@sinadicciones.org" className="underline decoration-[#FF6B5E]">contacto@sinadicciones.org</a>.</p>
          </section>

          <p className="text-xs text-white/40 mt-8">Ver también nuestros <Link to="/terminos" className="underline">Términos y condiciones</Link>.</p>
        </div>
      </div>
    </div>
  );
}
