import type { ApexOptions } from "apexcharts";

export const CORES_DASHBOARD = {
  slate100: "#f1f5f9",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate700: "#334155",
  slate800: "#1e293b",
  rose: "#f43f5e",
  roseLight: "#fb7185",
  cyan: "#06b6d4",
  cyanLight: "#22d3ee",
  violet: "#8b5cf6",
  redNeon: "#ef4444",
  emerald: "#10b981",
};

export function opcoesBaseLight(): ApexOptions {
  return {
    chart: {
      background: "transparent",
      foreColor: CORES_DASHBOARD.slate500,
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 4,
    },
    dataLabels: { enabled: false },
    legend: {
      labels: { colors: CORES_DASHBOARD.slate700 },
      fontSize: "11px",
    },
    tooltip: {
      theme: "light",
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: CORES_DASHBOARD.slate500, fontSize: "10px" } },
    },
    yaxis: {
      labels: { style: { colors: CORES_DASHBOARD.slate500, fontSize: "10px" } },
    },
  };
}

export function opcoesBaseChart(escuro: boolean): ApexOptions {
  return escuro ? opcoesBaseDark() : opcoesBaseLight();
}

export function opcoesBaseDark(): ApexOptions {
  return {
    chart: {
      background: "transparent",
      foreColor: CORES_DASHBOARD.slate400,
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    grid: {
      borderColor: "#1e293b",
      strokeDashArray: 4,
    },
    dataLabels: { enabled: false },
    legend: {
      labels: { colors: CORES_DASHBOARD.slate400 },
      fontSize: "11px",
    },
    tooltip: {
      theme: "dark",
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: CORES_DASHBOARD.slate500, fontSize: "10px" } },
    },
    yaxis: {
      labels: { style: { colors: CORES_DASHBOARD.slate500, fontSize: "10px" } },
    },
  };
}

export function formatarDataCurta(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso;
  }
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}
