"use client";

import { motion } from "framer-motion";

interface PricePoint {
  date: string;
  price: number;
}

interface CompetitorPriceChartProps {
  data: PricePoint[];
  currentPrice: number;
  height?: number;
  className?: string;
}

export function CompetitorPriceChart({
  data,
  currentPrice,
  height = 120,
  className,
}: CompetitorPriceChartProps) {
  if (data.length < 2) return null;

  const width = 400;
  const padding = { top: 15, right: 15, bottom: 25, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const prices = data.map((d) => d.price);
  const maxP = Math.max(...prices) * 1.05;
  const minP = Math.min(...prices) * 0.95;
  const range = maxP - minP || 1;

  const x = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const y = (val: number) => padding.top + chartH - ((val - minP) / range) * chartH;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.price).toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${x(data.length - 1).toFixed(1)} ${(padding.top + chartH).toFixed(1)} L ${x(0).toFixed(1)} ${(padding.top + chartH).toFixed(1)} Z`;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Current price reference line */}
        <line
          x1={padding.left}
          y1={y(currentPrice)}
          x2={width - padding.right}
          y2={y(currentPrice)}
          stroke="#34d399"
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.5"
        />
        <text
          x={width - padding.right + 2}
          y={y(currentPrice) + 3}
          className="fill-emerald-500"
          fontSize="8"
        >
          ${currentPrice}
        </text>

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="url(#priceGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#818cf8"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* X-axis labels */}
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((d, i) => {
          const idx = data.indexOf(d);
          return (
            <text
              key={i}
              x={x(idx)}
              y={height - 5}
              textAnchor="middle"
              className="fill-slate-400 dark:fill-zinc-500"
              fontSize="8"
            >
              {d.date}
            </text>
          );
        })}

        {/* Y-axis labels */}
        {[minP, (minP + maxP) / 2, maxP].map((val, i) => (
          <text
            key={i}
            x={padding.left - 5}
            y={y(val) + 3}
            textAnchor="end"
            className="fill-slate-400 dark:fill-zinc-500"
            fontSize="8"
            fontFamily="monospace"
          >
            ${val.toFixed(0)}
          </text>
        ))}
      </svg>
    </div>
  );
}
