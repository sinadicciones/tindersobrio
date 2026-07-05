import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terminos() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-[#0E0F13] text-white">
      <div className="mx-auto max-w-2xl px-6 pt-10 pb-16">
        <button onClick={()=>nav(-1)} className="flex items-center gap-1 text-white/60 mb-5"><ArrowLeft size={18}/> Volver</button>
        <h1 className="font-display text-4xl font-black tracking-tight">Términos y condiciones</h1>
        <p className="text-white/50 text-sm mt-1">Última actualización: febrero de 2026</p>

        <div className="mt-8 space-y-6 text-white/80 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-bold text-white">Quiénes somos</h2>
            <p className="mt-2 text-sm">PlanSobrio es una comunidad chilena para conocer personas que viven sin alcohol ni drogas. La app conecta a personas con cuatro intenciones: apoyo, amistad, amor y grupos.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Quién puede usar la app</h2>
            <ul className="mt-2 text-sm space-y-1 list-disc list-inside marker:text-[#8B5CF6]">
              <li>Solo personas mayores de 18 años.</li>
              <li>Debes usar información veraz sobre tu edad y ubicación.</li>
              <li>Una cuenta por persona; usar un alias en lugar del nombre real es parte del diseño.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Reglas de la comunidad</h2>
            <ul className="mt-2 text-sm space-y-1 list-disc list-inside marker:text-[#FF6B5E]">
              <li>Prohibido ofrecer alcohol o drogas dentro o fuera de la app.</li>
              <li>Prohibido romantizar el consumo.</li>
              <li>Respeto siempre: nada de acoso, insultos ni presiones.</li>
              <li>Coordina las juntas cuidándote: primer encuentro de día, en lugar público, cuéntale a alguien de confianza dónde estarás.</li>
              <li>El equipo puede advertir, suspender o dar de baja cuentas que no cumplan estas reglas.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Contenido que compartes</h2>
            <p className="mt-2 text-sm">Tú eres responsable de las fotos, frases y mensajes que publiques. Al subir contenido nos das permiso para mostrarlo dentro de la app a otros usuarios. Puedes eliminar tu contenido o tu cuenta en cualquier momento.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Aviso importante</h2>
            <p className="mt-2 text-sm">PlanSobrio <strong>no reemplaza tratamiento profesional</strong> ni atención de urgencia. Si estás en crisis, llama a Salud Responde (600 360 7777), a Prevención del suicidio (*4141) o a Urgencias (131).</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Cambios</h2>
            <p className="mt-2 text-sm">Podemos actualizar estos términos. Cuando lo hagamos, publicaremos la nueva fecha arriba y te avisaremos dentro de la app.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-white">Contacto</h2>
            <p className="mt-2 text-sm">Escríbenos a <a href="mailto:contacto@sinadicciones.org" className="underline decoration-[#FF6B5E]">contacto@sinadicciones.org</a>.</p>
          </section>

          <p className="text-xs text-white/40 mt-8">Ver también nuestra <Link to="/privacidad" className="underline">Política de privacidad</Link>.</p>
        </div>
      </div>
    </div>
  );
}
