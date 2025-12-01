import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Users,
  Download,
  Activity,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

type Venta = {
  id: number;
  ano: number;
  periodo: number;
  mesCod: string;          // "ENE", "FEB", etc.
  mesLabel: string;        // "Ene", "Feb", etc.
  codVen: string;
  vendedor: string;
  ventas: number;
  meta1: number;
  meta2: number;
  cumplimiento1: number;
  cumplimiento2: number;
  fechaActualizacion?: string;
};

type FiltroAno = "Todos" | number;
type FiltroVendedor = "Todos" | string;
type FiltroMes = "Todos" | string;

const MESES_ORDEN = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

// Paleta sugerida (azules, verdes, naranjas, morados)
const COLORS = {
  fondo1: "#020617", // slate-950
  fondo2: "#0f172a", // slate-900
  panel: "#020617",
  bordePanel: "#1e293b",
  texto: "#e5e7eb",
  textoSuave: "#9ca3af",
  accentBlue: "#3b82f6",
  accentGreen: "#22c55e",
  accentOrange: "#f97316",
  accentPurple: "#a855f7",
  accentCyan: "#06b6d4",
};

const COLOR_SERIES = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#06b6d4",
  "#facc15",
];

function normalizarMesCod(mes: string | undefined | null): string {
  if (!mes) return "";
  return mes.toString().trim().toUpperCase();
}

function mesLabelDesdeCod(mesCod: string): string {
  const mapa: Record<string, string> = {
    ENE: "Ene",
    FEB: "Feb",
    MAR: "Mar",
    ABR: "Abr",
    MAY: "May",
    JUN: "Jun",
    JUL: "Jul",
    AGO: "Ago",
    SEP: "Sep",
    OCT: "Oct",
    NOV: "Nov",
    DIC: "Dic",
  };
  return mapa[mesCod] ?? mesCod;
}

function numeroSeguro(v: any): number {
  if (v === null || v === undefined || v === "" || v === "-") return 0;
  if (typeof v === "number") return v;
  const limpio = v.toString().replace(/[\s$,]/g, "").replace(/\./g, "").replace(/,/g, ".");
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

const Dashboard: React.FC = () => {
  const [datos, setDatos] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(
    null
  );

  const [filtroAno, setFiltroAno] = useState<FiltroAno>("Todos");
  const [filtroVendedor, setFiltroVendedor] = useState<FiltroVendedor>("Todos");
  const [filtroMes, setFiltroMes] = useState<FiltroMes>("Todos");

  // --- Cargar datos desde la API ---
  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch(`${API_URL}/ventas`);
      if (!resp.ok) {
        throw new Error(`Error HTTP ${resp.status}`);
      }
      const json = await resp.json();

      if (!json.success || !Array.isArray(json.data)) {
        throw new Error("Formato de respuesta inválido");
      }

      const mapeados: Venta[] = json.data.map((r: any, idx: number) => {
        const ano =
          Number(r.ano ?? r.ANO ?? r["año"] ?? r.Año ?? new Date().getFullYear());
        const periodo = Number(r.periodo ?? r.PERIODO ?? idx + 1);
        const mesCod = normalizarMesCod(r.mes ?? r.MES);
        const mesLabel = mesLabelDesdeCod(mesCod);
        const codVen = (r.cod_ven ?? r.COD_VEN ?? "").toString().trim();
        const vendedor = (r.vendedor ?? r.VENDEDOR ?? "").toString().trim();

        const ventas = numeroSeguro(r.ventas ?? r.VENTAS);
        const meta1 = numeroSeguro(r.meta1 ?? r.META1 ?? r.meta ?? r.META);
        const meta2 = numeroSeguro(r.meta2 ?? r.META2);
        let cumplimiento1 = numeroSeguro(
          r.cumplimiento1 ?? r.CUMPLIMIENTO1 ?? r.cumplimiento ?? r.CUMPLIMIENTO
        );
        let cumplimiento2 = numeroSeguro(
          r.cumplimiento2 ?? r.CUMPLIMIENTO2
        );

        if (cumplimiento1 === 0 && meta1 > 0) {
          cumplimiento1 = (ventas / meta1) * 100;
        }
        if (cumplimiento2 === 0 && meta2 > 0) {
          cumplimiento2 = (ventas / meta2) * 100;
        }

        const fechaActualizacion =
          r.fecha_actualizacion ??
          r.FECHA_ACTUALIZACION ??
          json.timestamp ??
          null;

        return {
          id: Number(r.id ?? idx + 1),
          ano,
          periodo,
          mesCod,
          mesLabel,
          codVen,
          vendedor,
          ventas,
          meta1,
          meta2,
          cumplimiento1,
          cumplimiento2,
          fechaActualizacion: fechaActualizacion
            ? fechaActualizacion.toString()
            : undefined,
        };
      });

      setDatos(mapeados);
      setUltimaActualizacion(new Date());
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al cargar datos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // --- Listas para filtros ---
  const añosDisponibles = useMemo(() => {
    const años = Array.from(new Set(datos.map((d) => d.ano))).sort(
      (a, b) => b - a
    );
    return ["Todos" as const, ...años];
  }, [datos]);

  const vendedoresDisponibles = useMemo(() => {
    const vendedores = Array.from(
      new Set(datos.map((d) => d.vendedor).filter(Boolean))
    ).sort();
    return ["Todos" as const, ...vendedores];
  }, [datos]);

  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set(
      datos.map((d) => d.mesCod).filter((m) => m && MESES_ORDEN.includes(m))
    );
    const lista = Array.from(setMeses).sort(
      (a, b) => MESES_ORDEN.indexOf(a) - MESES_ORDEN.indexOf(b)
    );
    return ["Todos" as const, ...lista];
  }, [datos]);

  // --- Aplicar filtros ---
  const datosFiltrados = useMemo(() => {
    return datos.filter((d) => {
      const okAno = filtroAno === "Todos" || d.ano === filtroAno;
      const okVen =
        filtroVendedor === "Todos" || d.vendedor === filtroVendedor;
      const okMes = filtroMes === "Todos" || d.mesCod === filtroMes;
      return okAno && okVen && okMes;
    });
  }, [datos, filtroAno, filtroVendedor, filtroMes]);

  // --- Agrupación por periodo (para gráficos) ---
  const datosPorPeriodo = useMemo(() => {
    const mapa = new Map<
      string,
      {
        clave: string;
        periodo: number;
        mesLabel: string;
        ventas: number;
        meta1: number;
        meta2: number;
      }
    >();

    datosFiltrados.forEach((d) => {
      const clave = `${String(d.periodo).padStart(2, "0")} ${d.mesLabel}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          periodo: d.periodo,
          mesLabel: d.mesLabel,
          ventas: 0,
          meta1: 0,
          meta2: 0,
        });
      }
      const item = mapa.get(clave)!;
      item.ventas += d.ventas;
      item.meta1 += d.meta1;
      item.meta2 += d.meta2;
    });

    const arr = Array.from(mapa.values());
    arr.sort((a, b) => a.periodo - b.periodo);
    return arr.map((item) => ({
      periodoLabel: item.clave,
      ventas: item.ventas,
      meta1: item.meta1,
      meta2: item.meta2,
      cumplimiento1:
        item.meta1 > 0 ? (item.ventas / item.meta1) * 100 : 0,
      cumplimiento2:
        item.meta2 > 0 ? (item.ventas / item.meta2) * 100 : 0,
    }));
  }, [datosFiltrados]);

  // --- Agrupación por vendedor ---
  const datosPorVendedor = useMemo(() => {
    const mapa = new Map<
      string,
      { vendedor: string; ventas: number; meta1: number; meta2: number }
    >();

    datosFiltrados.forEach((d) => {
      if (!mapa.has(d.vendedor)) {
        mapa.set(d.vendedor, {
          vendedor: d.vendedor,
          ventas: 0,
          meta1: 0,
          meta2: 0,
        });
      }
      const item = mapa.get(d.vendedor)!;
      item.ventas += d.ventas;
      item.meta1 += d.meta1;
      item.meta2 += d.meta2;
    });

    const arr = Array.from(mapa.values()).map((v) => ({
      ...v,
      cumplimiento1: v.meta1 > 0 ? (v.ventas / v.meta1) * 100 : 0,
      cumplimiento2: v.meta2 > 0 ? (v.ventas / v.meta2) * 100 : 0,
    }));

    arr.sort((a, b) => b.ventas - a.ventas);
    return arr;
  }, [datosFiltrados]);

  // --- KPIs Globales ---
  const kpis = useMemo(() => {
    if (datosFiltrados.length === 0) {
      return {
        totalVentas: 0,
        totalMeta1: 0,
        totalMeta2: 0,
        porcMeta1: 0,
        porcMeta2: 0,
        promCumpl1: 0,
        promCumpl2: 0,
        registros: 0,
      };
    }

    let totalVentas = 0;
    let totalMeta1 = 0;
    let totalMeta2 = 0;
    let sumaCumpl1 = 0;
    let sumaCumpl2 = 0;
    let conCumpl1 = 0;
    let conCumpl2 = 0;

    datosFiltrados.forEach((d) => {
      totalVentas += d.ventas;
      totalMeta1 += d.meta1;
      totalMeta2 += d.meta2;

      const c1 =
        d.cumplimiento1 || (d.meta1 > 0 ? (d.ventas / d.meta1) * 100 : 0);
      const c2 =
        d.cumplimiento2 || (d.meta2 > 0 ? (d.ventas / d.meta2) * 100 : 0);

      if (c1 > 0) {
        sumaCumpl1 += c1;
        conCumpl1 += 1;
      }
      if (c2 > 0) {
        sumaCumpl2 += c2;
        conCumpl2 += 1;
      }
    });

    const porcMeta1 = totalMeta1 > 0 ? (totalVentas / totalMeta1) * 100 : 0;
    const porcMeta2 = totalMeta2 > 0 ? (totalVentas / totalMeta2) * 100 : 0;

    return {
      totalVentas,
      totalMeta1,
      totalMeta2,
      porcMeta1,
      porcMeta2,
      promCumpl1: conCumpl1 > 0 ? sumaCumpl1 / conCumpl1 : 0,
      promCumpl2: conCumpl2 > 0 ? sumaCumpl2 / conCumpl2 : 0,
      registros: datosFiltrados.length,
    };
  }, [datosFiltrados]);

  // --- Datos para gráfico pastel de estructura de metas ---
  const dataPieMetas = useMemo(
    () => [
      { name: "Meta 1", value: metasEstructura.meta1 },
      { name: "Meta 2", value: metasEstructura.meta2 },
    ],
    [metasEstructura.meta1, metasEstructura.meta2]
  );
    a.download = `dashboard_ventas_${hoy}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: `radial-gradient(circle at top, #0f172a, #020617 55%)`,
      }}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: COLORS.texto }}>
            Dashboard de Ventas – Novasoft
          </h1>
          <p className="mt-1 text-sm" style={{ color: COLORS.textoSuave }}>
            Datos en línea desde API SQL Server ·{" "}
            {cargando
              ? "Cargando..."
              : ultimaActualizacion
              ? `Última actualización: ${ultimaActualizacion.toLocaleString(
                  "es-CO"
                )}`
              : "Sin actualización aún"}
          </p>
          <p className="text-xs mt-1" style={{ color: COLORS.textoSuave }}>
            Registros filtrados: {kpis.registros} · Total registros API:{" "}
            {datos.length}
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-400">
              ⚠ Error al cargar datos: {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-start">
          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-md"
            style={{
              backgroundColor: COLORS.accentBlue,
              color: "white",
              opacity: cargando ? 0.7 : 1,
            }}
          >
            <Activity className="w-4 h-4" />
            {cargando ? "Actualizando..." : "Actualizar desde API"}
          </button>
          <button
            onClick={handleDescargar}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-md border border-slate-600"
            style={{
              backgroundColor: COLORS.panel,
              color: COLORS.texto,
            }}
          >
            <Download className="w-4 h-4" />
            Exportar datos (JSON)
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div
        className="mb-6 rounded-xl p-4"
        style={{
          backgroundColor: COLORS.panel,
          border: `1px solid ${COLORS.bordePanel}`,
        }}
      >
        <div className="grid md:grid-cols-3 gap-4">
          {/* Año */}
          <div>
            <label
              className="block text-xs font-semibold mb-1 uppercase tracking-wide"
              style={{ color: COLORS.textoSuave }}
            >
              Año
            </label>
            <select
              value={filtroAno}
              onChange={(e) =>
                setFiltroAno(
                  e.target.value === "Todos"
                    ? "Todos"
                    : Number(e.target.value)
                )
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
              style={{ color: COLORS.texto }}
            >
              {añosDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a === "Todos" ? "Todos los años" : a}
                </option>
              ))}
            </select>
          </div>

          {/* Vendedor */}
          <div>
            <label
              className="block text-xs font-semibold mb-1 uppercase tracking-wide"
              style={{ color: COLORS.textoSuave }}
            >
              Vendedor
            </label>
            <select
              value={filtroVendedor}
              onChange={(e) =>
                setFiltroVendedor(
                  e.target.value === "Todos" ? "Todos" : e.target.value
                )
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
              style={{ color: COLORS.texto }}
            >
              {vendedoresDisponibles.map((v) => (
                <option key={v} value={v}>
                  {v === "Todos" ? "Todos los vendedores" : v}
                </option>
              ))}
            </select>
          </div>

          {/* Mes / Periodo */}
          <div>
            <label
              className="block text-xs font-semibold mb-1 uppercase tracking-wide"
              style={{ color: COLORS.textoSuave }}
            >
              Mes / Periodo
            </label>
            <select
              value={filtroMes}
              onChange={(e) =>
                setFiltroMes(
                  e.target.value === "Todos" ? "Todos" : e.target.value
                )
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
              style={{ color: COLORS.texto }}
            >
              {mesesDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m === "Todos" ? "Todos los meses" : mesLabelDesdeCod(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        {/* Ventas totales */}
        <div
          className="rounded-xl p-5 shadow-md"
          style={{
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.95), rgba(59,130,246,0.9))",
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs uppercase tracking-wide text-blue-100">
              Ventas Totales
            </span>
            <DollarSign className="w-5 h-5 text-blue-100" />
          </div>
          <p className="text-2xl font-bold text-white">
            $
            {(kpis.totalVentas / 1_000_000).toLocaleString("es-CO", {
              maximumFractionDigits: 1,
            })}
            M
          </p>
          <p className="text-xs text-blue-100 mt-1">
            Registros filtrados: {kpis.registros}
          </p>
        </div>

        {/* Cumplimiento Meta 1 */}
        <div
          className="rounded-xl p-5 shadow-md"
          style={{
            background:
              "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(5,150,105,0.9))",
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs uppercase tracking-wide text-emerald-100">
              Meta 1 (Oficial / Presupuesto)
            </span>
            {kpis.porcMeta1 >= 100 ? (
              <TrendingUp className="w-5 h-5 text-emerald-100" />
            ) : (
              <TrendingDown className="w-5 h-5 text-emerald-100" />
            )}
          </div>
          <p className="text-2xl font-bold text-white">
            {kpis.porcMeta1.toFixed(1)}%
          </p>
          <p className="text-xs text-emerald-100 mt-1">
            Promedio cumplimiento: {kpis.promCumpl1.toFixed(1)}%
          </p>
        </div>

        {/* Cumplimiento Meta 2 */}
        <div
          className="rounded-xl p-5 shadow-md"
          style={{
            background:
              "linear-gradient(135deg, rgba(249,115,22,0.95), rgba(217,70,239,0.9))",
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs uppercase tracking-wide text-orange-100">
              Meta 2 (Alterna / Retadora)
            </span>
            {kpis.porcMeta2 >= 100 ? (
              <TrendingUp className="w-5 h-5 text-orange-100" />
            ) : (
              <TrendingDown className="w-5 h-5 text-orange-100" />
            )}
          </div>
          <p className="text-2xl font-bold text-white">
            {kpis.porcMeta2.toFixed(1)}%
          </p>
          <p className="text-xs text-orange-100 mt-1">
            Promedio cumplimiento: {kpis.promCumpl2.toFixed(1)}%
          </p>
        </div>

        {/* Estructura de metas */}
        <div
          className="rounded-xl p-5 shadow-md flex flex-col justify-between"
          style={{
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.bordePanel}`,
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: COLORS.textoSuave }}
            >
              Estructura de Metas
            </span>
            <Users className="w-5 h-5" style={{ color: COLORS.accentCyan }} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs space-y-1" style={{ color: COLORS.texto }}>
              <p>
                Meta 1:{" "}
                <span className="font-semibold text-blue-400">
                  $
                  {metasEstructura.meta1.toLocaleString("es-CO", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </p>
              <p>
                Meta 2:{" "}
                <span className="font-semibold text-purple-400">
                  $
                  {metasEstructura.meta2.toLocaleString("es-CO", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </p>
            </div>
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataPieMetas}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={18}
                    outerRadius={40}
                    paddingAngle={2}
                  >
                    <Cell fill="#60a5fa" />
                    <Cell fill="#f97316" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Ventas vs Meta1 vs Meta2 */}
        <div
          className="rounded-xl p-5 shadow-md"
          style={{
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.bordePanel}`,
          }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: COLORS.texto }}
          >
            Ventas vs Meta 1 y Meta 2 por periodo
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={datosPorPeriodo}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis
                dataKey="periodoLabel"
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #374151",
                  color: "#e5e7eb",
                }}
              />
              <Legend />
              <Bar
                dataKey="ventas"
                name="Ventas"
                fill={COLORS.accentBlue}
                radius={[6, 6, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="meta1"
                name="Meta 1"
                stroke={COLORS.accentGreen}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="meta2"
                name="Meta 2"
                stroke={COLORS.accentOrange}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* % Cumplimiento por periodo */}
        <div
          className="rounded-xl p-5 shadow-md"
          style={{
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.bordePanel}`,
          }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: COLORS.texto }}
          >
            % Cumplimiento por periodo (Meta 1 vs Meta 2)
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={datosPorPeriodo}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis
                dataKey="periodoLabel"
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #374151",
                  color: "#e5e7eb",
                }}
              />
              <Legend />
              <Bar
                dataKey="cumplimiento1"
                name="% Cumpl. Meta 1"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="cumplimiento2"
                name="% Cumpl. Meta 2"
                fill="#f97316"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla + ranking vendedores */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tabla ejecutado vs metas */}
        <div
          className="rounded-xl p-5 shadow-md lg:col-span-2 overflow-hidden"
          style={{
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.bordePanel}`,
          }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: COLORS.texto }}
          >
            Comparativo Ejecutado vs Meta 1 y Meta 2
          </h2>
          <div className="overflow-x-auto max-h-[340px]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/60">
                  <th className="px-3 py-2 text-left text-slate-300">
                    Periodo
                  </th>
                  <th className="px-3 py-2 text-right text-slate-300">
                    Ventas
                  </th>
                  <th className="px-3 py-2 text-right text-slate-300">
                    Meta 1
                  </th>
                  <th className="px-3 py-2 text-right text-slate-300">
                    % C1
                  </th>
                  <th className="px-3 py-2 text-right text-slate-300">
                    Meta 2
                  </th>
                  <th className="px-3 py-2 text-right text-slate-300">
                    % C2
                  </th>
                </tr>
              </thead>
              <tbody>
                {datosPorPeriodo.map((row) => {
                  const diff1 = row.ventas - row.meta1;
                  const diff2 = row.ventas - row.meta2;
                  const ok1 = row.cumplimiento1 >= 100;
                  const ok2 = row.cumplimiento2 >= 100;
                  return (
                    <tr
                      key={row.periodoLabel}
                      className="border-b border-slate-800 hover:bg-slate-800/60"
                    >
                      <td className="px-3 py-2 text-slate-200">
                        {row.periodoLabel}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-400">
                        $
                        {row.ventas.toLocaleString("es-CO", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-300">
                        $
                        {row.meta1.toLocaleString("es-CO", {
                          maximumFractionDigits: 0,
                        })}
                        <span
                          className={`ml-2 text-xs ${
                            diff1 >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {diff1 >= 0 ? "+" : ""}
                          {diff1.toLocaleString("es-CO")}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          ok1
                            ? "text-emerald-400"
                            : row.cumplimiento1 >= 90
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {row.cumplimiento1.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right text-purple-300">
                        $
                        {row.meta2.toLocaleString("es-CO", {
                          maximumFractionDigits: 0,
                        })}
                        <span
                          className={`ml-2 text-xs ${
                            diff2 >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {diff2 >= 0 ? "+" : ""}
                          {diff2.toLocaleString("es-CO")}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          ok2
                            ? "text-emerald-400"
                            : row.cumplimiento2 >= 90
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {row.cumplimiento2.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking vendedores */}
        <div
          className="rounded-xl p-5 shadow-md"
          style={{
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.bordePanel}`,
          }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: COLORS.texto }}
          >
            Ranking de Vendedores (Ventas vs Metas)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={datosPorVendedor}
              layout="vertical"
              margin={{ left: 70 }}
            >
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis
                type="category"
                dataKey="vendedor"
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #374151",
                  color: "#e5e7eb",
                }}
              />
              <Legend />
              <Bar
                dataKey="ventas"
                name="Ventas"
                fill={COLORS.accentBlue}
                radius={[0, 8, 8, 0]}
              />
              <Bar
                dataKey="meta1"
                name="Meta 1"
                fill={COLORS.accentGreen}
                radius={[0, 8, 8, 0]}
              />
              <Bar
                dataKey="meta2"
                name="Meta 2"
                fill={COLORS.accentOrange}
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
