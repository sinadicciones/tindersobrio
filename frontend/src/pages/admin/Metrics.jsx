import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShieldAlert, Users, Sparkles, LineChart as LineIcon,
  Filter, AlertTriangle, Heart, CalendarCheck, MessageCircle, Repeat, Shield, Download,
} from "lucide-react";

const RANGES = [
  { v: 7, l: "7 días" },
  { v: 30, l: "30 días" },
  { v: 90, l: "90 días" },
];

const SUBTABS = [
  { v: "resumen", l: "Resumen", icon: Sparkles },
  { v: "embudo", l: "Embudo", icon: Filter },
  { v: "matching", l: "Matching", icon: Heart },
  { v: "planes", l: "Planes", icon: CalendarCheck },
  { v: "comunidad", l: "Comunidad", icon: MessageCircle },
  { v: "retencion", l: "Retención", icon: Repeat },
  { v: "seguridad", l: "Seguridad", icon: Shield },
];

const COL_CORAL = "#FF6B5E";
const COL_VIOLET = "#8B5CF6";
const COL_MINT = "#4ADE80";
const COL_GRID = "rgba(255,255,255,0.08)";
const COL_AXIS = "rgba(255,255,255,0.5)";

const tabular = { fontVariantNumeric: "tabular-nums" };

function fmtDate(d) {
  // "YYYY-MM-DD" → "DD/MM"
  if (!d || d.length < 10) return d;
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

function pct(n, base) {
  if (!base) return "0%";
  return `${((n / base) * 100).toFixed(0)}%`;
}

function DeltaBadge({ current, previous }) {
  if (previous == null || previous === 0) {
    return <span className="text-[11px] text-white/50">sin comparación</span>;
  }
  const delta = ((current - previous) / previous) * 100;
  const up = delta >= 0;
  const Ico = up ? TrendingUp : TrendingDown;
  const color = up ? COL_MINT : COL_CORAL;
  return (
    <span
      data-testid="delta-badge"
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}1a`, border: `1px solid ${color}55` }}
    >
      <Ico size={11} strokeWidth={2}/> {up ? "+" : ""}{delta.toFixed(0)}%
    </span>
  );
}

function KpiCard({ label, value, sub, tone, testid }) {
  const toneStyle = {
    warning: { color: "#FBBF24" },
    danger: { color: COL_CORAL },
    positive: { color: COL_MINT },
  }[tone] || { color: "#fff" };
  return (
    <div data-testid={testid} className="ps-card p-4">
      <p className="text-[10px] uppercase tracking-[.13em] text-white/50 font-bold">{label}</p>
      <p className="font-display text-3xl font-black mt-1.5" style={{ ...toneStyle, ...tabular }}>{value}</p>
      {sub && <p className="text-[11px] text-white/60 mt-1">{sub}</p>}
    </div>
  );
}

function AlertRow({ alert }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-2xl" style={{ background: "rgba(255,107,94,0.08)", border: `1px solid ${COL_CORAL}55` }}>
      <AlertTriangle size={16} strokeWidth={1.9} className="shrink-0 mt-0.5" style={{ color: COL_CORAL }}/>
      <p className="text-sm text-white/90">{alert.message}</p>
    </div>
  );
}

function ChartCard({ title, testid, children }) {
  return (
    <div data-testid={testid} className="ps-card p-4">
      <p className="text-[10px] uppercase tracking-[.13em] text-white/50 font-bold flex items-center gap-1.5 mb-3">
        <LineIcon size={12} strokeWidth={2}/> {title}
      </p>
      <div style={{ width: "100%", height: 220 }}>
        {children}
      </div>
    </div>
  );
}

function ResumenTab({ data }) {
  if (!data) return <p className="text-white/50">Cargando métricas…</p>;
  const ns = data.north_star;
  const c = data.cards;
  const gravePending = c.oldest_grave_hours > 4;

  return (
    <div className="space-y-4">
      {/* North star */}
      <div
        data-testid="metrics-north-star"
        className="ps-card p-5"
        style={{ background: "linear-gradient(135deg, rgba(255,107,94,0.08), rgba(139,92,246,0.08))", border: `1px solid ${COL_VIOLET}55` }}
      >
        <p className="text-[10px] uppercase tracking-[.13em] text-white/70 font-bold">
          Métrica norte · Planes realizados esta semana
        </p>
        <div className="mt-3 flex items-end gap-4 flex-wrap">
          <p data-testid="metrics-realized-week" className="font-display font-black leading-none" style={{ fontSize: 56, ...tabular }}>{ns.realized_this_week}</p>
          <div className="pb-1.5">
            <DeltaBadge current={ns.realized_this_week} previous={ns.realized_last_week}/>
            <p className="text-[11px] text-white/60 mt-1" style={tabular}>
              Semana anterior: {ns.realized_last_week}
            </p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard testid="kpi-dau" label="Activos hoy (DAU)" value={c.dau_today}/>
        <KpiCard testid="kpi-wau" label="Activos 7d (WAU)" value={c.wau_7d}/>
        <KpiCard testid="kpi-matches-week" label="Matches semana" value={c.matches_week}/>
        <KpiCard testid="kpi-like-to-match" label="Like → Match" value={`${c.like_to_match_pct}%`}/>
        <KpiCard
          testid="kpi-open-reports"
          label="Reportes abiertos"
          value={c.open_reports}
          tone={gravePending ? "danger" : c.open_reports > 0 ? "warning" : "positive"}
          sub={gravePending ? `⚠ Grave sin atender hace ${c.oldest_grave_hours.toFixed(1)} h` : null}
        />
      </div>

      {/* Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <div data-testid="metrics-alerts" className="space-y-2">
          <p className="ps-lab"><ShieldAlert size={12} strokeWidth={2}/> Alertas de liquidez</p>
          {data.alerts.map((a) => <AlertRow key={a.key} alert={a}/>)}
        </div>
      )}

      {/* Chart 1: Registros vs Onboardings */}
      <ChartCard title="Registros vs onboarding completo" testid="chart-registrations">
        <ResponsiveContainer>
          <LineChart data={data.series} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={COL_GRID} vertical={false}/>
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
            <Tooltip contentStyle={{ background: "#161922", border: `1px solid rgba(255,255,255,0.16)`, borderRadius: 12 }} labelStyle={{ color: "#fff", fontSize: 11 }} itemStyle={{ fontSize: 12 }} labelFormatter={fmtDate}/>
            <Legend wrapperStyle={{ fontSize: 11 }}/>
            <Line type="monotone" dataKey="registrations" name="Registros" stroke={COL_CORAL} strokeWidth={2} dot={false}/>
            <Line type="monotone" dataKey="onboardings" name="Onboarding" stroke={COL_VIOLET} strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 2: Matches y planes confirmados */}
      <ChartCard title="Matches y planes confirmados por día" testid="chart-matches">
        <ResponsiveContainer>
          <LineChart data={data.series} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={COL_GRID} vertical={false}/>
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
            <Tooltip contentStyle={{ background: "#161922", border: `1px solid rgba(255,255,255,0.16)`, borderRadius: 12 }} labelStyle={{ color: "#fff", fontSize: 11 }} itemStyle={{ fontSize: 12 }} labelFormatter={fmtDate}/>
            <Legend wrapperStyle={{ fontSize: 11 }}/>
            <Line type="monotone" dataKey="matches" name="Matches" stroke={COL_CORAL} strokeWidth={2} dot={false}/>
            <Line type="monotone" dataKey="plans_confirmed" name="Planes confirmados" stroke={COL_MINT} strokeWidth={2} dot={false}/>
            <Line type="monotone" dataKey="plans_realized" name="Planes realizados" stroke={COL_VIOLET} strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function FunnelStep({ step, prevCount, isFirst }) {
  const width = Math.max(8, step.pct);
  const dropoff = !isFirst && prevCount != null ? prevCount - step.count : null;
  return (
    <div data-testid={`funnel-step-${step.key}`} className="ps-card p-3 relative overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 opacity-20"
        style={{ width: `${width}%`, background: "linear-gradient(90deg, #FF6B5E, #8B5CF6)" }}
      />
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-display font-black text-white text-[15px] leading-tight">{step.label}</p>
          {dropoff != null && dropoff > 0 && (
            <p className="text-[11px] text-white/50 mt-0.5">−{dropoff} personas</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-2xl font-black text-white" style={tabular}>{step.count}</p>
          <p className="text-[11px] text-white/60" style={tabular}>{step.pct}%</p>
        </div>
      </div>
    </div>
  );
}

function EmbudoTab({ data }) {
  if (!data) return <p className="text-white/50">Cargando embudo…</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-white/60">
        Embudo de los usuarios registrados en los últimos <span className="text-white font-bold">{data.days}</span> días.
        Cada porcentaje se calcula sobre el total de registrados de la cohorte.
      </p>

      <div className="space-y-2">
        {data.steps.map((s, i) => (
          <FunnelStep
            key={s.key}
            step={s}
            prevCount={i > 0 ? data.steps[i - 1].count : null}
            isFirst={i === 0}
          />
        ))}
      </div>

      {/* Median times */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          testid="median-reg-to-like"
          label="Registro → 1er like"
          value={data.median_hours.reg_to_first_like != null ? `${data.median_hours.reg_to_first_like}h` : "—"}
          sub="mediana"
        />
        <KpiCard
          testid="median-like-to-match"
          label="1er like → 1er match"
          value={data.median_hours.first_like_to_first_match != null ? `${data.median_hours.first_like_to_first_match}h` : "—"}
          sub="mediana"
        />
        <KpiCard
          testid="median-match-to-plan"
          label="Match → plan confirmado"
          value={data.median_hours.match_to_confirmed != null ? `${data.median_hours.match_to_confirmed}h` : "—"}
          sub="mediana"
        />
      </div>

      {/* Cohort table */}
      <div data-testid="cohort-table" className="ps-card p-4 overflow-x-auto">
        <p className="ps-lab mb-3"><Users size={12} strokeWidth={2}/> Cohortes semanales</p>
        <table className="w-full text-xs" style={tabular}>
          <thead>
            <tr className="text-white/50">
              <th className="text-left font-semibold pb-2">Semana</th>
              <th className="text-right font-semibold pb-2">Registrados</th>
              <th className="text-right font-semibold pb-2">Onboarding %</th>
              <th className="text-right font-semibold pb-2">Match %</th>
              <th className="text-right font-semibold pb-2">Confirmado %</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {data.cohorts.map((c) => (
              <tr key={c.week} className="border-t border-white/[.08]">
                <td className="py-2 text-white/80">{c.week}</td>
                <td className="py-2 text-right">{c.registered}</td>
                <td className="py-2 text-right"><CohortCell val={c.onboarded_pct}/></td>
                <td className="py-2 text-right"><CohortCell val={c.match_pct}/></td>
                <td className="py-2 text-right"><CohortCell val={c.confirmed_pct}/></td>
              </tr>
            ))}
            {data.cohorts.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-white/50">Sin datos suficientes en el rango.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CohortCell({ val }) {
  const intensity = Math.min(1, val / 60);
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-white font-semibold"
      style={{ background: `rgba(139,92,246,${(0.15 + intensity * 0.55).toFixed(2)})` }}
    >
      {val}%
    </span>
  );
}

// -------------------------------------------------------------------
// CSV export helper
// -------------------------------------------------------------------
function downloadCsv(filename, rows) {
  if (!rows || rows.length === 0) {
    toast.error("Sin datos para exportar en este rango");
    return;
  }
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function CsvExportButton({ onGetRows, filename, testid }) {
  return (
    <button
      data-testid={testid}
      onClick={() => downloadCsv(filename, onGetRows())}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-white/[.16] bg-white/5 hover:bg-white/10 text-white/80 transition"
    >
      <Download size={12} strokeWidth={2}/> Exportar CSV
    </button>
  );
}

// -------------------------------------------------------------------
// MATCHING tab
// -------------------------------------------------------------------
function MatchingTab({ data }) {
  if (!data) return <p className="text-white/50">Cargando matching…</p>;
  const pool = data.pool || {};
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CsvExportButton
          testid="csv-matching"
          filename={`matching_${data.days}d.csv`}
          onGetRows={() => data.likes_series}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard testid="matching-l2m" label="Like → Match" value={`${data.like_to_match_pct}%`}/>
        <KpiCard testid="matching-unresp" label="Me tinca sin respuesta" value={data.unresponded_likes.total} sub={data.unresponded_likes.median_age_hours != null ? `edad mediana ${data.unresponded_likes.median_age_hours}h` : "—"}/>
        <KpiCard testid="matching-attention" label="Top 10% concentra" value={`${data.attention_top10_pct}%`} tone={data.attention_top10_pct > 60 ? "danger" : null}/>
        <KpiCard testid="matching-quota" label="Agotó 20 me tinca" value={`${data.quota_exhausted_pct}%`}/>
      </div>

      <ChartCard title="Likes dados por día" testid="chart-likes">
        <ResponsiveContainer>
          <LineChart data={data.likes_series} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={COL_GRID} vertical={false}/>
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
            <Tooltip contentStyle={{ background: "#161922", border: `1px solid rgba(255,255,255,0.16)`, borderRadius: 12 }} labelStyle={{ color: "#fff", fontSize: 11 }} itemStyle={{ fontSize: 12 }} labelFormatter={fmtDate}/>
            <Line type="monotone" dataKey="likes" name="Me tinca" stroke={COL_CORAL} strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div data-testid="liquidity-cohorts" className="ps-card p-4 overflow-x-auto">
        <p className="ps-lab mb-3"><Users size={12} strokeWidth={2}/> KPI liquidez: ≥1 match en primeros 7 días (por semana de registro)</p>
        <table className="w-full text-xs" style={tabular}>
          <thead>
            <tr className="text-white/50">
              <th className="text-left font-semibold pb-2">Semana</th>
              <th className="text-right font-semibold pb-2">Registrados</th>
              <th className="text-right font-semibold pb-2">Con match 7d</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {data.liquidity_cohorts.map((c) => (
              <tr key={c.week} className="border-t border-white/[.08]">
                <td className="py-2 text-white/80">{c.week}</td>
                <td className="py-2 text-right">{c.registered}</td>
                <td className="py-2 text-right"><CohortCell val={c.matched_first_7d_pct}/></td>
              </tr>
            ))}
            {data.liquidity_cohorts.length === 0 && (
              <tr><td colSpan={3} className="py-4 text-center text-white/50">Sin datos suficientes en el rango.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DistroCard title="Género (pool activo 14d)" data={pool.by_gender}/>
        <DistroCard title="Modos activados" data={pool.by_mode}/>
        <DistroCard title="Edad" data={pool.by_age}/>
        <DistroCard title="Comuna (top 10)" data={pool.by_comuna}/>
      </div>
    </div>
  );
}

function DistroCard({ title, data }) {
  const entries = Object.entries(data || {});
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="ps-card p-4">
      <p className="ps-lab mb-2"><Users size={12} strokeWidth={2}/> {title}</p>
      {entries.length === 0 ? (
        <p className="text-xs text-white/50">Sin datos</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map(([k, v]) => (
            <li key={k} className="text-xs flex items-center justify-between gap-2">
              <span className="text-white/80 truncate">{k}</span>
              <span className="flex items-center gap-2">
                <span className="w-24 h-1.5 rounded-full bg-white/5">
                  <span className="block h-full rounded-full ps-gradient" style={{ width: `${(v / total) * 100}%` }}/>
                </span>
                <span className="font-semibold text-white" style={tabular}>{v}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// PLANES tab
// -------------------------------------------------------------------
function PlanesTab({ data }) {
  if (!data) return <p className="text-white/50">Cargando planes…</p>;
  const f = data.funnel;
  const activityChart = (data.activities || []).slice(0, 8);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CsvExportButton testid="csv-planes" filename={`planes_${data.days}d.csv`} onGetRows={() => data.activities}/>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard testid="planes-matches" label="Matches" value={f.matches}/>
        <KpiCard testid="planes-proposed" label="Con plan propuesto" value={f.proposed} sub={`${f.proposed_pct}%`}/>
        <KpiCard testid="planes-confirmed" label="Confirmados" value={f.confirmed} sub={`${f.confirmed_pct}%`} tone="positive"/>
        <KpiCard testid="planes-realized" label="Realizados" value={f.realized} sub={`${f.realized_pct}%`} tone="positive"/>
      </div>

      <ChartCard title="Actividades propuestas vs realizadas" testid="chart-activities">
        <ResponsiveContainer>
          <BarChart data={activityChart} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={COL_GRID} vertical={false}/>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: COL_AXIS }} tickLine={false} axisLine={false} angle={-15} height={40} textAnchor="end"/>
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
            <Tooltip contentStyle={{ background: "#161922", border: `1px solid rgba(255,255,255,0.16)`, borderRadius: 12 }} labelStyle={{ color: "#fff", fontSize: 11 }} itemStyle={{ fontSize: 12 }}/>
            <Legend wrapperStyle={{ fontSize: 11 }}/>
            <Bar dataKey="proposed" name="Propuestas" fill={COL_VIOLET} radius={[4, 4, 0, 0]}/>
            <Bar dataKey="realized" name="Realizadas" fill={COL_MINT} radius={[4, 4, 0, 0]}/>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard testid="median-match-conf" label="Match → confirmado" value={data.medians.match_to_confirmed_h != null ? `${data.medians.match_to_confirmed_h}h` : "—"} sub="mediana"/>
        <KpiCard testid="median-conf-when" label="Confirmado → fecha del plan" value={data.medians.confirmed_to_when_h != null ? `${data.medians.confirmed_to_when_h}h` : "—"} sub="mediana"/>
      </div>

      {!data.feedback.available && (
        <div className="ps-card p-4 border border-dashed border-white/20 text-sm text-white/60" data-testid="feedback-pending">
          {data.feedback.note}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// COMUNIDAD tab
// -------------------------------------------------------------------
function ComunidadTab({ data }) {
  if (!data) return <p className="text-white/50">Cargando comunidad…</p>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CsvExportButton testid="csv-comunidad" filename={`comunidad_${data.days}d.csv`} onGetRows={() => data.groups_stats}/>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard testid="com-total" label="Grupos totales" value={data.groups_total}/>
        <KpiCard testid="com-active" label="Grupos activos (7d)" value={data.groups_active}/>
        <KpiCard testid="com-events" label="Eventos creados" value={data.events_created}/>
        <KpiCard
          testid="com-in-group"
          label="Activos en ≥1 grupo"
          value={`${data.active_in_group_pct}%`}
          tone={data.active_in_group_pct < 40 ? "danger" : "positive"}
          sub={data.active_in_group_pct < 40 ? "⚠ Bajo el umbral 40%" : null}
        />
      </div>

      <div data-testid="groups-table" className="ps-card p-4 overflow-x-auto">
        <p className="ps-lab mb-3"><MessageCircle size={12} strokeWidth={2}/> Grupos por actividad</p>
        <table className="w-full text-xs" style={tabular}>
          <thead>
            <tr className="text-white/50">
              <th className="text-left font-semibold pb-2">Grupo</th>
              <th className="text-right font-semibold pb-2">Miembros</th>
              <th className="text-right font-semibold pb-2">Nuevos 7d</th>
              <th className="text-right font-semibold pb-2">Mensajes 7d</th>
              <th className="text-left font-semibold pb-2 pl-3">Próximo evento</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {data.groups_stats.map((g) => (
              <tr key={g.id} className="border-t border-white/[.08]">
                <td className="py-2 text-white/85 flex items-center gap-2">
                  {g.active && <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: COL_MINT }}/>}
                  {g.name}
                </td>
                <td className="py-2 text-right">{g.members}</td>
                <td className="py-2 text-right">{g.new_members_7d}</td>
                <td className="py-2 text-right">{g.messages_7d}</td>
                <td className="py-2 pl-3 text-white/60 truncate max-w-[200px]">
                  {g.next_event ? `${g.next_event.title} · ${g.next_event.when?.slice(0, 10)}` : "—"}
                </td>
              </tr>
            ))}
            {data.groups_stats.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-white/50">Sin grupos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// RETENCION tab
// -------------------------------------------------------------------
function RetencionTab({ data }) {
  if (!data) return <p className="text-white/50">Cargando retención…</p>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CsvExportButton testid="csv-retencion" filename={`retencion_${data.days}d.csv`} onGetRows={() => data.cohorts}/>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard testid="ret-stickiness" label="Stickiness (DAU/MAU)" value={`${data.stickiness_pct}%`}/>
        <KpiCard testid="ret-dormant" label="Dormidos (14+ días)" value={data.dormant_users} tone={data.dormant_users > 0 ? "warning" : null}/>
        <KpiCard testid="ret-resurrected" label="Resucitados" value={data.resurrected_users} tone="positive"/>
      </div>

      <div data-testid="retention-cohorts" className="ps-card p-4 overflow-x-auto">
        <p className="ps-lab mb-3"><Repeat size={12} strokeWidth={2}/> Curvas D1 / D7 / D30 por cohorte</p>
        <table className="w-full text-xs" style={tabular}>
          <thead>
            <tr className="text-white/50">
              <th className="text-left font-semibold pb-2">Semana</th>
              <th className="text-right font-semibold pb-2">Registrados</th>
              <th className="text-right font-semibold pb-2">D1</th>
              <th className="text-right font-semibold pb-2">D7</th>
              <th className="text-right font-semibold pb-2">D30</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {data.cohorts.map((c) => (
              <tr key={c.week} className="border-t border-white/[.08]">
                <td className="py-2 text-white/80">{c.week}</td>
                <td className="py-2 text-right">{c.registered}</td>
                <td className="py-2 text-right"><CohortCell val={c.d1_pct}/></td>
                <td className="py-2 text-right"><CohortCell val={c.d7_pct}/></td>
                <td className="py-2 text-right"><CohortCell val={c.d30_pct}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!data.email.integrated && (
        <div className="ps-card p-4 border border-dashed border-white/20 text-sm text-white/60" data-testid="email-pending">
          {data.email.note}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// SEGURIDAD tab
// -------------------------------------------------------------------
function SeguridadTab({ data }) {
  if (!data) return <p className="text-white/50">Cargando seguridad…</p>;
  const graveRedFlag = data.grave_under_4h_pct != null && data.grave_under_4h_pct < 100;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CsvExportButton testid="csv-seguridad" filename={`seguridad_${data.days}d.csv`} onGetRows={() => data.reports_series}/>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard testid="sec-median-res" label="Tiempo mediano resolución" value={data.median_resolution_h != null ? `${data.median_resolution_h}h` : "—"}/>
        <KpiCard
          testid="sec-grave-4h"
          label="Graves resueltos <4h"
          value={data.grave_under_4h_pct != null ? `${data.grave_under_4h_pct}%` : "—"}
          tone={graveRedFlag ? "danger" : "positive"}
          sub={data.grave_over_4h_open > 0 ? `⚠ ${data.grave_over_4h_open} graves abiertos >4h` : null}
        />
        <KpiCard testid="sec-blocks" label="Bloqueos" value={data.blocks_total} sub={`${data.block_ratio_pct}% de matches`}/>
        <KpiCard testid="sec-bans" label="Baneos / suspensiones" value={`${data.bans} / ${data.suspensions}`}/>
      </div>

      <ChartCard title="Reportes por día" testid="chart-reports">
        <ResponsiveContainer>
          <BarChart data={data.reports_series} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={COL_GRID} vertical={false}/>
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
            <Tooltip contentStyle={{ background: "#161922", border: `1px solid rgba(255,255,255,0.16)`, borderRadius: 12 }} labelStyle={{ color: "#fff", fontSize: 11 }} itemStyle={{ fontSize: 12 }} labelFormatter={fmtDate}/>
            <Bar dataKey="count" name="Reportes" fill={COL_CORAL} radius={[4, 4, 0, 0]}/>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DistroCard title="Reportes por categoría" data={data.by_category}/>
        <ChartCard title="Visitas 'Necesito apoyo' (anónimo)" testid="chart-support">
          <ResponsiveContainer>
            <LineChart data={data.support_series} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={COL_GRID} vertical={false}/>
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: COL_AXIS }} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{ background: "#161922", border: `1px solid rgba(255,255,255,0.16)`, borderRadius: 12 }} labelStyle={{ color: "#fff", fontSize: 11 }} itemStyle={{ fontSize: 12 }} labelFormatter={fmtDate}/>
              <Line type="monotone" dataKey="count" name="Visitas" stroke={COL_VIOLET} strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <p className="text-[11px] text-white/50">Nota: la métrica de &ldquo;Necesito apoyo&rdquo; es anónima, sin identificación de usuarios.</p>

      {data.recidivists.length > 0 && (
        <div data-testid="recidivists-table" className="ps-card p-4 overflow-x-auto">
          <p className="ps-lab mb-3"><ShieldAlert size={12} strokeWidth={2}/> Reincidentes (2+ reportantes distintos)</p>
          <table className="w-full text-xs" style={tabular}>
            <thead>
              <tr className="text-white/50">
                <th className="text-left font-semibold pb-2">Alias</th>
                <th className="text-left font-semibold pb-2">Email</th>
                <th className="text-left font-semibold pb-2">Estado</th>
                <th className="text-right font-semibold pb-2">Reportantes</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {data.recidivists.map((r) => (
                <tr key={r.id} className="border-t border-white/[.08]">
                  <td className="py-2">{r.alias || "—"}</td>
                  <td className="py-2 text-white/60 truncate max-w-[220px]">{r.email}</td>
                  <td className="py-2">{r.status || "activo"}</td>
                  <td className="py-2 text-right font-bold" style={{ color: COL_CORAL }}>{r.reporter_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Metrics() {
  const [days, setDays] = useState(7);
  const [subtab, setSubtab] = useState("resumen");
  const [dataByTab, setDataByTab] = useState({});
  const [loading, setLoading] = useState(false);

  const load = async (tab, d) => {
    setLoading(true);
    try {
      const map = { resumen: "summary", embudo: "funnel" };
      const endpoint = map[tab] || tab;
      const useDays = tab === "resumen" ? d : Math.max(d, 30);
      const { data } = await api.get(`/admin/metrics/${endpoint}`, { params: { days: useDays } });
      setDataByTab((prev) => ({ ...prev, [`${tab}_${useDays}`]: data }));
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "No pudimos cargar esa pestaña");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const useDays = subtab === "resumen" ? days : Math.max(days, 30);
    if (!dataByTab[`${subtab}_${useDays}`]) {
      load(subtab, days);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtab, days]);

  const currentDays = subtab === "resumen" ? days : Math.max(days, 30);
  const current = dataByTab[`${subtab}_${currentDays}`];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {SUBTABS.map((t) => {
          const active = subtab === t.v;
          return (
            <button
              key={t.v}
              data-testid={`metrics-subtab-${t.v}`}
              onClick={() => setSubtab(t.v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${active ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6]"}`}
            >
              <t.icon size={12} strokeWidth={2}/> {t.l}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wider">Rango</span>
          <div className="flex gap-1 rounded-full bg-white/5 border border-white/[.16] p-1">
            {RANGES.map((r) => (
              <button
                key={r.v}
                data-testid={`metrics-range-${r.v}`}
                onClick={() => setDays(r.v)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${days === r.v ? "ps-gradient text-white" : "text-white/70 hover:text-white"}`}
              >
                {r.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && !current && <p className="text-white/50 py-6 text-center">Cargando…</p>}

      {subtab === "resumen" && <ResumenTab data={current}/>}
      {subtab === "embudo" && <EmbudoTab data={current}/>}
      {subtab === "matching" && <MatchingTab data={current}/>}
      {subtab === "planes" && <PlanesTab data={current}/>}
      {subtab === "comunidad" && <ComunidadTab data={current}/>}
      {subtab === "retencion" && <RetencionTab data={current}/>}
      {subtab === "seguridad" && <SeguridadTab data={current}/>}

      <p className="text-[11px] text-white/40 mt-4">
        Métricas agregadas calculadas desde nuestra propia base de datos. Nunca se muestran mensajes, datos de consumo individuales ni identidad de quienes visitan &ldquo;Necesito apoyo&rdquo;.
      </p>
    </div>
  );
}
