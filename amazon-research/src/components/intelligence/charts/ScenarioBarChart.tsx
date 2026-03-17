"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScenarioData {
  label: string;
  revenue: number;
  profit: number;
  roi: number;
}

interface ScenarioBarChartProps {
  scenarios: ScenarioData[];
  height?: number;
  className?: string;
}

const BAR_COLORS = [
  { fill: "#818cf8", label: "Revenue" },
  { fill: "#34d399", label: "Profit" },
];

export function ScenarioBarChart({
  scenarios,
  height = 180,
  className,
}: ScenarioBarChartProps) {
  const width = 400;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = scenarios.flatMap((s) => [s.revenue, s.profit]);
  const maxVal = Math.max(...allValues, 1);

  const groupWidth = chartW / scenarios.length;
  const barWidth = groupWidth * 0.3;
  const barGap = barWidth * 0.3;

  const yScale = (val: number) => (val / maxVal) * chartH;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const yPos = padding.top + chartH - chartH * pct;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={width - padding.right}
                y2={yPos}
                stroke="currentColor"
                className="text-slate-200 dark:text-zinc-800"
                strokeWidth="0.5"
              />
              <text
                x={padding.left - 8}
                y={yPos + 3}
                textAnchor="end"
                className="fill-slate-400 dark:fill-zinc-500"
                fontSize="9"
                fontFamily="monospace"
              >
                ${Math.round(maxVal * pct).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {scenarios.map((scenario, gi) => {
          const groupX = padding.left + gi * groupWidth + groupWidth / 2;
          const bars = [scenario.revenue, scenario.profit];

          return (
            <g key={scenario.label}>
              {bars.map((value, bi) => {
                const barH = yScale(value);
                const barX = groupX - barWidth - barGap / 2 + bi * (barWidth + barGap);
                const barY = padding.top + chartH - barH;

                return (
                  <motion.rect
                    key={bi}
                    x={barX}
                    y={padding.top + chartH}
                    width={barWidth}
                    height={0}
                    rx={2}
                    fill={BAR_COLORS[bi].fill}
                    animate={{ y: barY, height: barH }}
                    transition={{
                      duration: 0.6,
                      delay: gi * 0.15 + bi * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                );
              })}

              {/* Scenario label */}
              <text
                x={groupX}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-zinc-400"
                fontSize="10"
              >
                {scenario.label}
              </text>

              {/* ROI label */}
              <text
                x={groupX}
                y={height - 22}
                textAnchor="middle"
                className="fill-slate-400 dark:fill-zinc-500"
                fontSize="8"
              >
                ROI: {scenario.roi}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-1">
        {BAR_COLORS.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.fill }} />
            <span className="text-[10px] text-slate-500 dark:text-zinc-400">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
