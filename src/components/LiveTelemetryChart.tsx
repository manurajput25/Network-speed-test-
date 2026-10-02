import React, { useMemo, useState } from 'react';
import { TelemetryPoint } from '../types/speedtest';
import { Activity } from 'lucide-react';

interface LiveTelemetryChartProps {
  telemetry: TelemetryPoint[];
  currentPhase: string;
  unit: 'Mbps' | 'MB/s' | 'Gbps';
}

export const LiveTelemetryChart: React.FC<LiveTelemetryChartProps> = ({
  telemetry,
  currentPhase,
  unit,
}) => {
  const [hoverPoint, setHoverPoint] = useState<TelemetryPoint | null>(null);

  // SVG dimensions
  const width = 640;
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 26, left: 45 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Dynamic max scale
  const maxMbps = useMemo(() => {
    if (telemetry.length === 0) return 100;
    const maxVal = Math.max(...telemetry.map((t) => t.instantMbps), 10);
    if (maxVal > 500) return 1000;
    if (maxVal > 200) return 500;
    if (maxVal > 100) return 250;
    if (maxVal > 50) return 100;
    return 50;
  }, [telemetry]);

  const maxTime = useMemo(() => {
    if (telemetry.length === 0) return 10000;
    const maxT = Math.max(...telemetry.map((t) => t.timeMs), 5000);
    return Math.max(maxT, 8000);
  }, [telemetry]);

  const dlPoints = useMemo(() => telemetry.filter((t) => t.phase === 'download'), [telemetry]);
  const ulPoints = useMemo(() => telemetry.filter((t) => t.phase === 'upload'), [telemetry]);

  const buildPath = (points: TelemetryPoint[], isArea: boolean = false) => {
    if (points.length === 0) return '';

    const coords = points.map((p) => {
      const x = padding.left + (p.timeMs / maxTime) * chartW;
      const y = padding.top + chartH - (p.smoothMbps / maxMbps) * chartH;
      return { x: Math.min(Math.max(x, padding.left), width - padding.right), y: Math.max(y, padding.top) };
    });

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      d += ` L ${coords[i].x} ${coords[i].y}`;
    }

    if (isArea) {
      const lastX = coords[coords.length - 1].x;
      const firstX = coords[0].x;
      const bottomY = padding.top + chartH;
      d += ` L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }

    return d;
  };

  const dlLine = useMemo(() => buildPath(dlPoints, false), [dlPoints, maxTime, maxMbps]);
  const dlArea = useMemo(() => buildPath(dlPoints, true), [dlPoints, maxTime, maxMbps]);
  const ulLine = useMemo(() => buildPath(ulPoints, false), [ulPoints, maxTime, maxMbps]);
  const ulArea = useMemo(() => buildPath(ulPoints, true), [ulPoints, maxTime, maxMbps]);

  const gridSteps = [0, maxMbps * 0.33, maxMbps * 0.66, maxMbps];

  return (
    <div className="w-full bg-[#080c15]/95 border border-slate-800/90 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-2xl">
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-25 pointer-events-none" />

      {/* Header telemetry ribbon */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-display uppercase tracking-widest text-slate-200">
              SPECTRAL BANDWIDTH OSCILLOSCOPE
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono-data">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_#00f0ff]" />
              CH.1 DOWN
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#10e599]" />
              CH.2 UP
            </span>
          </div>

          {hoverPoint ? (
            <span className="text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
              <strong className="text-white">{hoverPoint.smoothMbps.toFixed(2)}</strong> {unit}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 uppercase">
              {currentPhase === 'idle' ? 'STANDBY' : 'REAL-TIME TRACE'}
            </span>
          )}
        </div>
      </div>

      {/* SVG Waveform Chart */}
      <div className="relative w-full h-[160px] overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full cursor-crosshair"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverPoint(null)}
        >
          <defs>
            <linearGradient id="dlOscGrad" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="ulOscGrad" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stopColor="#10e599" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10e599" stopOpacity="0.0" />
            </linearGradient>
            <filter id="oscLineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {gridSteps.map((val) => {
            const y = padding.top + chartH - (val / maxMbps) * chartH;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#172033"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono-data fill-slate-500 font-bold"
                >
                  {Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Time axis marks */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#1e293b"
            strokeWidth="1"
          />
          <text
            x={padding.left}
            y={height - 6}
            className="text-[9px] font-mono-data fill-slate-500"
          >
            T+0.0s
          </text>
          <text
            x={width - padding.right}
            y={height - 6}
            textAnchor="end"
            className="text-[9px] font-mono-data fill-slate-500"
          >
            T+{(maxTime / 1000).toFixed(1)}s
          </text>

          {/* Download fill and glowing curve */}
          {dlArea && <path d={dlArea} fill="url(#dlOscGrad)" />}
          {dlLine && (
            <path
              d={dlLine}
              fill="none"
              stroke="#00f0ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#oscLineGlow)"
            />
          )}

          {/* Upload fill and glowing curve */}
          {ulArea && <path d={ulArea} fill="url(#ulOscGrad)" />}
          {ulLine && (
            <path
              d={ulLine}
              fill="none"
              stroke="#10e599"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#oscLineGlow)"
            />
          )}

          {/* Scanning Beam Head */}
          {telemetry.length > 0 && (
            (() => {
              const last = telemetry[telemetry.length - 1];
              const x = padding.left + (last.timeMs / maxTime) * chartW;
              const y = padding.top + chartH - (last.smoothMbps / maxMbps) * chartH;
              const isDl = last.phase === 'download';
              return (
                <g>
                  {/* Vertical scan cursor line */}
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={height - padding.bottom}
                    stroke={isDl ? '#00f0ff' : '#10e599'}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    strokeOpacity="0.6"
                  />
                  {/* Pulsing cursor head */}
                  <circle
                    cx={Math.min(Math.max(x, padding.left), width - padding.right)}
                    cy={Math.max(y, padding.top)}
                    r="4.5"
                    fill={isDl ? '#00f0ff' : '#10e599'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    filter="url(#oscLineGlow)"
                  />
                </g>
              );
            })()
          )}
        </svg>
      </div>
    </div>
  );
};
