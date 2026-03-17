"use client";

import { motion } from "framer-motion";

interface DataPoint {
  month: number;
  revenue: number;
  costs: number;
  profit: number;
}

interface AreaChartProps {
  data: DataPoint[];
  height?: number;
  className?: string;
}

export function AreaChart({ data, height = 200, className }: AreaChartProps) {
  if (data.length === 0) return null;

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = data.flatMap((d) => [d.revenue, d.costs, d.profit]);
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const x = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const y = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;

  const buildPath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  const buildAreaPath = (values: number[]) => {
    const line = buildPath(values);
    return `${line} L ${x(values.length - 1).toFixed(1)} ${y(minVal).toFixed(1)} L ${x(0).toFixed(1)} ${y(minVal).toFixed(1)} Z`;
  };

  const revenuePath = buildPath(data.map((d) => d.revenue));
  const profitPath = buildPath(data.map((d) => d.profit));
  const revenueAreaPath = buildAreaPath(data.map((d) => d.revenue));
  const profitAreaPath = buildAreaPath(data.map((d) => d.profit));

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => minVal + (range * i) / 4);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={y(tick)}
            x2={width - padding.right}
            y2={y(tick)}
            stroke="currentColor"
            className="text-slate-200 dark:text-zinc-800"
            strokeWidth="0.5"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={y(tick) + 3}
            textAnchor="end"
            className="fill-slate-400 dark:fill-zinc-500"
            fontSize="9"
            fontFamily="monospace"
          >
            ${Math.round(tick).toLocaleString()}
          </text>
        ))}

        {/* X-axis labels */}
        {data.filter((_, i) => i % 3 === 0).map((d, i) => (
          <text
            key={i}
            x={x(d.month - 1)}
            y={height - 5}
            textAnchor="middle"
            className="fill-slate-400 dark:fill-zinc-500"
            fontSize="9"
          >
            M{d.month}
          </text>
        ))}

        {/* Zero line */}
        {minVal < 0 && (
          <line
            x1={padding.left}
            y1={y(0)}
            x2={width - padding.right}
            y2={y(0)}
            stroke="currentColor"
            className="text-slate-300 dark:text-zinc-700"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        )}

        {/* Area fills */}
        <motion.path
          d={revenueAreaPath}
          fill="url(#revenueGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={profitAreaPath}
          fill="url(#profitGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />

        {/* Lines */}
        <motion.path
          d={revenuePath}
          fill="none"
          stroke="#818cf8"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <motion.path
          d={profitPath}
          fill="none"
          stroke="#34d399"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        />
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-indigo-400" />
          <span className="text-[10px] text-slate-500 dark:text-zinc-400">Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-emerald-400" />
          <span className="text-[10px] text-slate-500 dark:text-zinc-400">Cumulative Profit</span>
        </div>
      </div>
    </div>
  );
}
