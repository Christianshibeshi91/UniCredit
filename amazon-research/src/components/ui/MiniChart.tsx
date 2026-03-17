"use client";

import { cn } from "@/lib/utils";

interface MiniBarChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  barColor?: string;
  className?: string;
}

export function MiniBarChart({
  data,
  labels,
  height = 80,
  barColor = "bg-indigo-500",
  className,
}: MiniBarChartProps) {
  const max = Math.max(...data, 1);

  return (
    <div className={cn("flex items-end gap-1.5", className)} style={{ height }}>
      {data.map((value, i) => {
        const pct = (value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn("w-full rounded-t-sm transition-all duration-500", barColor)}
              style={{ height: `${Math.max(pct, 4)}%`, opacity: 0.3 + (pct / 100) * 0.7 }}
            />
            {labels && (
              <span className="text-[9px] text-slate-400 dark:text-zinc-500">{labels[i]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface MiniLineChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  className?: string;
}

export function MiniLineChart({
  data,
  labels,
  height = 80,
  color = "#818cf8",
  className,
}: MiniLineChartProps) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 4;
  const svgHeight = height;
  const svgWidth = 100; // will be scaled via viewBox

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * (svgWidth - padding * 2);
    const y = svgHeight - padding - ((value - min) / range) * (svgHeight - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d={areaPath}
          fill={`url(#gradient-${color.replace("#", "")})`}
        />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
        ))}
      </svg>
      {labels && (
        <div className="flex justify-between mt-1">
          {labels.map((l, i) => (
            <span key={i} className="text-[9px] text-slate-400 dark:text-zinc-500">{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

export function DonutChart({
  segments,
  size = 120,
  thickness = 14,
  centerLabel,
  centerValue,
  className,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 148, 168, 0.2)"
          strokeWidth={thickness}
        />
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashLength = pct * circumference;
          const dashGap = circumference - dashLength;
          const offset = cumulativeOffset;
          cumulativeOffset += dashLength;

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dashLength} ${dashGap}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-700"
            />
          );
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-mono">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-[10px] text-zinc-500">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
