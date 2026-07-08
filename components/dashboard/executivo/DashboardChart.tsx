"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type DashboardChartProps = {
  type:
    | "bar"
    | "line"
    | "area"
    | "donut"
    | "radialBar";
  series: ApexOptions["series"];
  options: ApexOptions;
  height?: number;
};

export function DashboardChart({
  type,
  series,
  options,
  height = 280,
}: DashboardChartProps) {
  return (
    <ApexChart
      type={type}
      series={series}
      options={options}
      height={height}
      width="100%"
    />
  );
}
