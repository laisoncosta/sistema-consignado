import type { ApexOptions } from "apexcharts";

export function opcoesGraficoLinhaPainel(params: {
  corPrimaria: string;
  categorias: string[];
  escuro: boolean;
  tituloEixoY?: string;
  formatarTooltip?: (valor: number) => string;
}): ApexOptions {
  const {
    corPrimaria,
    categorias,
    escuro,
    tituloEixoY = "Minutos",
    formatarTooltip = (valor) => `${valor} min`,
  } = params;

  const labelColor = escuro ? "#94a3b8" : "#64748b";
  const gridColor = escuro ? "#334155" : "#e2e8f0";

  return {
    chart: {
      background: "transparent",
      foreColor: labelColor,
      toolbar: { show: false },
      fontFamily: "inherit",
      zoom: { enabled: false },
      sparkline: { enabled: false },
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    colors: [corPrimaria],
    grid: {
      borderColor: gridColor,
      strokeDashArray: 3,
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: categorias,
      labels: {
        style: { colors: labelColor, fontSize: "10px" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: {
        text: tituloEixoY,
        style: { color: labelColor, fontWeight: 500, fontSize: "11px" },
      },
      labels: {
        style: { colors: labelColor, fontSize: "10px" },
      },
      min: 0,
    },
    tooltip: {
      theme: escuro ? "dark" : "light",
      y: {
        formatter: formatarTooltip,
      },
    },
  };
}
