import React, { useMemo } from 'react';
import { TestPhase } from '../types/speedtest';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface SpeedGaugeProps {
  speedMbps: number; // Canonical speed in Mbps
  peakSpeedMbps: number; // Canonical peak in Mbps
  unit: 'Mbps' | 'MB/s' | 'Gbps';
  phase: TestPhase;
  progressPct: number;
  pingMs?: number;
  jitterMs?: number;
  downloadMbps?: number;
  uploadMbps?: number;
  completedView?: 'download' | 'upload';
  onToggleCompletedView?: (view: 'download' | 'upload') => void;
}

interface ScaleDefinition {
  points: number[];
  fractions: number[];
  subDivisions: number[];
}

export function convertSpeed(mbps: number, unit: 'Mbps' | 'MB/s' | 'Gbps'): number {
  if (unit === 'MB/s') return mbps / 8;
  if (unit === 'Gbps') return mbps / 1000;
  return mbps;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  speedMbps,
  peakSpeedMbps,
  unit,
  phase,
  progressPct,
  pingMs,
  jitterMs,
  downloadMbps = 0,
  uploadMbps = 0,
  completedView = 'download',
  onToggleCompletedView,
}) => {
  // Geometry Constants
  const cx = 200;
  const cy = 200;
  const radius = 145;
  const startAngleDeg = 135; // 7:30 o'clock (bottom-left)
  const sweepAngleDeg = 270; // 270° clockwise sweep to 4:30 o'clock (bottom-right)
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweepAngleDeg / 360) * circumference;

  // Selected speed based on phase or completed view
  const activeSpeedMbps = useMemo(() => {
    if (phase === 'completed') {
      return completedView === 'upload' ? uploadMbps : downloadMbps;
    }
    return speedMbps;
  }, [phase, completedView, speedMbps, downloadMbps, uploadMbps]);

  // Convert canonical Mbps to the selected unit for display and scaling
  const displaySpeed = useMemo(() => {
    return convertSpeed(activeSpeedMbps, unit);
  }, [activeSpeedMbps, unit]);

  const displayPeak = useMemo(() => {
    return convertSpeed(peakSpeedMbps, unit);
  }, [peakSpeedMbps, unit]);

  // Calibrated, non-linear logarithmic speed scale matching each unit
  const scaleDef: ScaleDefinition = useMemo(() => {
    if (unit === 'MB/s') {
      return {
        points: [0, 1, 2, 5, 10, 25, 50, 75, 125],
        fractions: [0, 0.08, 0.16, 0.30, 0.44, 0.60, 0.76, 0.88, 1.00],
        subDivisions: [1, 1, 2, 4, 2, 4, 2, 4],
      };
    }
    if (unit === 'Gbps') {
      return {
        points: [0, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0],
        fractions: [0, 0.10, 0.22, 0.36, 0.54, 0.72, 0.88, 1.00],
        subDivisions: [1, 3, 3, 2, 4, 3, 4],
      };
    }
    // Default Mbps scale: 0 to 1000 Mbps
    return {
      points: [0, 5, 10, 25, 50, 100, 250, 500, 1000],
      fractions: [0, 0.08, 0.16, 0.30, 0.44, 0.60, 0.76, 0.88, 1.00],
      subDivisions: [4, 4, 2, 4, 4, 2, 4, 4],
    };
  }, [unit]);

  // Convert display speed to fractional dial position [0.0 - 1.0]
  const speedToFraction = (speed: number): number => {
    if (speed <= 0) return 0;
    const { points, fractions } = scaleDef;
    const maxPoint = points[points.length - 1];

    if (speed >= maxPoint) {
      return Math.min(1 + ((speed - maxPoint) / maxPoint) * 0.05, 1.02);
    }

    for (let i = 0; i < points.length - 1; i++) {
      const pLow = points[i];
      const pHigh = points[i + 1];
      if (speed >= pLow && speed <= pHigh) {
        const segFrac = (speed - pLow) / (pHigh - pLow);
        const fLow = fractions[i];
        const fHigh = fractions[i + 1];
        return fLow + segFrac * (fHigh - fLow);
      }
    }
    return 0;
  };

  // Dial fractions
  const ratio = speedToFraction(displaySpeed);
  const peakRatio = speedToFraction(displayPeak);

  // Pin Angles
  const needleAngle = startAngleDeg + ratio * sweepAngleDeg;
  const peakAngle = startAngleDeg + peakRatio * sweepAngleDeg;

  // Active glowing arc offset
  const strokeDashoffset = arcLength * (1 - Math.min(ratio, 1));

  // Compute Major Ticks
  const majorTicks = useMemo(() => {
    const { points, fractions } = scaleDef;
    return points.map((val, idx) => {
      const frac = fractions[idx];
      const angle = startAngleDeg + frac * sweepAngleDeg;
      const rad = (angle * Math.PI) / 180;
      return { val, frac, angle, rad };
    });
  }, [scaleDef]);

  // Compute Minor Ticks
  const minorTicks = useMemo(() => {
    const { points, fractions, subDivisions } = scaleDef;
    const ticks: { angle: number; rad: number; frac: number }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const numSubs = subDivisions[i] || 2;
      const fLow = fractions[i];
      const fHigh = fractions[i + 1];

      for (let s = 1; s < numSubs; s++) {
        const subFrac = fLow + (s / numSubs) * (fHigh - fLow);
        const angle = startAngleDeg + subFrac * sweepAngleDeg;
        const rad = (angle * Math.PI) / 180;
        ticks.push({ angle, rad, frac: subFrac });
      }
    }
    return ticks;
  }, [scaleDef]);

  // Color theme
  const isUploadActive = phase === 'upload' || (phase === 'completed' && completedView === 'upload');

  const getPhaseTheme = () => {
    switch (phase) {
      case 'ping':
        return {
          primary: '#38bdf8',
          glow: 'rgba(56, 189, 248, 0.6)',
          ambient: 'rgba(56, 189, 248, 0.15)',
          label: 'MEASURING LATENCY',
          tier: 'QUANTUM PROBE',
          colorClass: 'text-sky-400',
        };
      case 'download':
        return {
          primary: '#00f0ff',
          glow: 'rgba(0, 240, 255, 0.65)',
          ambient: 'rgba(0, 240, 255, 0.2)',
          label: 'STREAMING DOWNLOAD',
          tier:
            activeSpeedMbps > 500
              ? 'GIGABIT FIBER'
              : activeSpeedMbps > 200
              ? 'ULTRA BROADBAND'
              : activeSpeedMbps > 50
              ? 'FAST BROADBAND'
              : 'STANDARD BROADBAND',
          colorClass: 'text-[#00f0ff]',
        };
      case 'upload':
        return {
          primary: '#10e599',
          glow: 'rgba(16, 229, 153, 0.65)',
          ambient: 'rgba(16, 229, 153, 0.2)',
          label: 'BUFFERING UPLOAD',
          tier: activeSpeedMbps > 100 ? 'GIGABIT UPSTREAM' : 'HIGH CAPACITY',
          colorClass: 'text-[#10e599]',
        };
      case 'completed':
        return {
          primary: isUploadActive ? '#10e599' : '#00f0ff',
          glow: isUploadActive ? 'rgba(16, 229, 153, 0.5)' : 'rgba(0, 240, 255, 0.5)',
          ambient: 'rgba(0, 240, 255, 0.12)',
          label: isUploadActive ? 'UPLOAD RESULT' : 'DOWNLOAD RESULT',
          tier: 'TEST COMPLETED',
          colorClass: isUploadActive ? 'text-[#10e599]' : 'text-[#00f0ff]',
        };
      case 'error':
        return {
          primary: '#ff3366',
          glow: 'rgba(255, 51, 102, 0.6)',
          ambient: 'rgba(255, 51, 102, 0.2)',
          label: 'CONNECTION TIMEOUT',
          tier: 'ERROR',
          colorClass: 'text-rose-400',
        };
      default:
        return {
          primary: '#475569',
          glow: 'transparent',
          ambient: 'rgba(14, 165, 233, 0.05)',
          label: 'NEURAL LINK STANDBY',
          tier: 'READY TO SCAN',
          colorClass: 'text-slate-400',
        };
    }
  };

  const theme = getPhaseTheme();

  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none">
      {/* Sci-Fi Hologram Dial Container */}
      <div className="relative w-[360px] h-[360px] sm:w-[420px] sm:h-[420px] flex items-center justify-center">
        {/* Dynamic Holographic Backdrop Ambient Light */}
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${theme.glow} 0%, ${theme.ambient} 45%, transparent 70%)`,
            opacity: phase === 'download' || phase === 'upload' || phase === 'completed' ? 0.65 : 0.2,
            filter: 'blur(16px)',
          }}
        />

        {/* Ambient Ring Scanlines */}
        <div className="absolute inset-4 rounded-full border border-cyan-500/10 pointer-events-none" />
        <div className="absolute inset-10 rounded-full border border-indigo-500/10 pointer-events-none" />

        <svg className="w-full h-full transform" viewBox="0 0 400 400">
          <defs>
            <linearGradient id="cyberDownloadGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="55%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            <linearGradient id="cyberUploadGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10e599" />
              <stop offset="70%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="pinNeedleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#e2e8f0" />
              <stop offset="85%" stopColor={isUploadActive ? '#10e599' : '#00f0ff'} />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            <filter id="neonBeamGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur1" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Outer Hologram Radar Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={184}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="4 8 1 8"
            className="opacity-60"
          />

          {/* 2. Outer Technical Labels */}
          <g className="text-slate-600 text-[8px] font-mono-data">
            <text x="32" y="38" fill="#475569">UNIT // {unit}</text>
            <text x="306" y="38" fill="#475569">CALIBRATED</text>
            <text x="32" y="375" fill="#475569">0 {unit}</text>
            <text x="300" y="375" fill="#475569">{scaleDef.points[scaleDef.points.length - 1]} {unit}</text>
          </g>

          {/* 3. Base Graduation Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#0d1424"
            strokeWidth={10}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform={`rotate(${startAngleDeg} ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform={`rotate(${startAngleDeg} ${cx} ${cy})`}
          />

          {/* 4. Active Glowing Bandwidth Progress Arc */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={isUploadActive ? 'url(#cyberUploadGrad)' : 'url(#cyberDownloadGrad)'}
            strokeWidth={6}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#neonBeamGlow)"
            className="transition-all duration-150 ease-out"
            transform={`rotate(${startAngleDeg} ${cx} ${cy})`}
          />

          {/* 5. Minor Sub-Ticks */}
          {minorTicks.map((tick, idx) => {
            const isFilled = tick.frac <= ratio && displaySpeed > 0;
            const innerR = radius - 8;
            const outerR = radius - 2;

            const x1 = cx + innerR * Math.cos(tick.rad);
            const y1 = cy + innerR * Math.sin(tick.rad);
            const x2 = cx + outerR * Math.cos(tick.rad);
            const y2 = cy + outerR * Math.sin(tick.rad);

            return (
              <line
                key={`minor-${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isFilled ? (isUploadActive ? '#10e599' : '#00f0ff') : '#334155'}
                strokeWidth="1"
                className="transition-colors duration-150"
              />
            );
          })}

          {/* 6. Major Ticks & Scale Numbers (Exact Calibrated Positions) */}
          {majorTicks.map((tick) => {
            const isFilled = displaySpeed >= tick.val && displaySpeed > 0;
            const innerR = radius - 16;
            const outerR = radius + 2;
            const labelR = radius - 28;

            const x1 = cx + innerR * Math.cos(tick.rad);
            const y1 = cy + innerR * Math.sin(tick.rad);
            const x2 = cx + outerR * Math.cos(tick.rad);
            const y2 = cy + outerR * Math.sin(tick.rad);

            const tx = cx + labelR * Math.cos(tick.rad);
            const ty = cy + labelR * Math.sin(tick.rad);

            return (
              <g key={`major-${tick.val}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={
                    isFilled
                      ? isUploadActive
                        ? '#10e599'
                        : '#00f0ff'
                      : '#64748b'
                  }
                  strokeWidth="2"
                  filter={isFilled ? 'url(#neonBeamGlow)' : undefined}
                  className="transition-colors duration-150"
                />
                <text
                  x={tx}
                  y={ty + 4}
                  textAnchor="middle"
                  className={`text-[11px] font-mono-data font-bold transition-all duration-200 ${
                    isFilled
                      ? isUploadActive
                        ? 'fill-emerald-300 drop-shadow-[0_0_8px_rgba(16,229,153,0.9)]'
                        : 'fill-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.9)]'
                      : 'fill-slate-500'
                  }`}
                >
                  {tick.val}
                </text>
              </g>
            );
          })}

          {/* 7. Stop Pins (At 0 and Max) */}
          {(() => {
            const rad0 = (startAngleDeg * Math.PI) / 180;
            const radMax = ((startAngleDeg + sweepAngleDeg) * Math.PI) / 180;
            const pinR = radius + 10;
            return (
              <>
                <circle cx={cx + pinR * Math.cos(rad0)} cy={cy + pinR * Math.sin(rad0)} r="2" fill="#475569" />
                <circle cx={cx + pinR * Math.cos(radMax)} cy={cy + pinR * Math.sin(radMax)} r="2" fill="#475569" />
              </>
            );
          })()}

          {/* 8. Peak Speed Ghost Needle */}
          {peakSpeedMbps > 0 && (
            <g
              transform={`rotate(${peakAngle} ${cx} ${cy})`}
              className="transition-transform duration-300 ease-out"
            >
              <line
                x1={cx + 40}
                y1={cy}
                x2={cx + radius}
                y2={cy}
                stroke="#a855f7"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeOpacity="0.8"
              />
              <polygon
                points={`${cx + radius + 2},${cy} ${cx + radius - 6},${cy - 3} ${cx + radius - 6},${cy + 3}`}
                fill="#a855f7"
                filter="url(#neonBeamGlow)"
              />
            </g>
          )}

          {/* 9. High-Precision Mechanical Needle Pin */}
          <g
            transform={`rotate(${needleAngle} ${cx} ${cy})`}
            style={{
              transition: 'transform 180ms cubic-bezier(0.18, 0.89, 0.32, 1.05)',
            }}
            className="origin-center"
          >
            {/* Needle Counterweight */}
            <path
              d={`M ${cx - 24} ${cy} L ${cx - 10} ${cy - 3} L ${cx} ${cy - 2} L ${cx} ${cy + 2} L ${cx - 10} ${cy + 3} Z`}
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="0.5"
            />
            <circle cx={cx - 16} cy={cy} r="3" fill="#0b1120" stroke="#475569" strokeWidth="1" />

            {/* Glowing Neon Aura */}
            <line
              x1={cx}
              y1={cy}
              x2={cx + radius - 2}
              y2={cy}
              stroke={phase === 'idle' ? '#475569' : theme.primary}
              strokeWidth="3"
              strokeOpacity="0.35"
              filter="url(#needleGlow)"
            />

            {/* Main Precision Tapered Pin */}
            <polygon
              points={`${cx + radius},${cy} ${cx + radius - 14},${cy - 1.2} ${cx + 10},${cy - 2.5} ${cx + 10},${cy + 2.5} ${cx + radius - 14},${cy + 1.2}`}
              fill="url(#pinNeedleGrad)"
            />

            {/* Center Razor Hairline */}
            <line
              x1={cx + 12}
              y1={cy}
              x2={cx + radius}
              y2={cy}
              stroke={isUploadActive ? '#10e599' : '#ffffff'}
              strokeWidth="1"
            />

            {/* Needle Tip Indicator Jewel */}
            <circle
              cx={cx + radius}
              cy={cy}
              r="2"
              fill={isUploadActive ? '#10e599' : '#00f0ff'}
              filter="url(#neonBeamGlow)"
            />
          </g>

          {/* 10. Center Precision Pivot Hub */}
          <circle cx={cx} cy={cy} r={22} fill="#070c18" stroke="#1e293b" strokeWidth="2.5" />
          <circle cx={cx} cy={cy} r={14} fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <circle
            cx={cx}
            cy={cy}
            r={6}
            fill={phase === 'idle' ? '#475569' : theme.primary}
            filter="url(#neonBeamGlow)"
            className={phase !== 'idle' ? 'animate-pulse' : ''}
          />
        </svg>

        {/* Center Digital Telemetry HUD Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-28 pointer-events-none">
          {/* Phase Badge or Completed View Switcher */}
          {phase === 'completed' && onToggleCompletedView ? (
            <div className="flex items-center gap-1 mb-1 p-0.5 rounded-lg bg-slate-950/90 border border-slate-800 backdrop-blur-md pointer-events-auto">
              <button
                onClick={() => onToggleCompletedView('download')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono-data font-bold transition-all cursor-pointer ${
                  completedView === 'download'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDown className="w-2.5 h-2.5" />
                DL: {convertSpeed(downloadMbps, unit).toFixed(1)}
              </button>
              <button
                onClick={() => onToggleCompletedView('upload')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono-data font-bold transition-all cursor-pointer ${
                  completedView === 'upload'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,229,153,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUp className="w-2.5 h-2.5" />
                UL: {convertSpeed(uploadMbps, unit).toFixed(1)}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1 px-3 py-0.5 rounded-full bg-slate-950/85 border border-slate-800/80 backdrop-blur-md shadow-lg">
              <span
                className={`w-2 h-2 rounded-full ${
                  phase === 'download' || phase === 'upload' || phase === 'ping'
                    ? 'bg-cyan-400 animate-ping'
                    : phase === 'completed'
                    ? 'bg-emerald-400'
                    : 'bg-slate-600'
                }`}
              />
              <span className={`text-[10px] font-mono-data tracking-widest uppercase font-bold ${theme.colorClass}`}>
                {theme.label}
              </span>
            </div>
          )}

          {/* Main Bandwidth Numeric Readout with Glow */}
          <div className="flex items-baseline gap-2 my-0.5">
            <span className="text-5xl sm:text-6xl font-display font-black tracking-tight text-white tabular-nums drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              {phase === 'ping'
                ? pingMs !== undefined ? pingMs : '--'
                : phase === 'idle'
                ? '0.00'
                : displaySpeed.toFixed(2)}
            </span>
            <span className="text-sm sm:text-base font-display uppercase font-bold text-cyan-400 tracking-wider">
              {phase === 'ping' ? 'ms' : unit}
            </span>
          </div>

          {/* Secondary Sub-Metric Telemetry */}
          <div className="flex items-center gap-3 text-xs font-mono-data text-slate-400 mt-1 px-3 py-1 rounded-md bg-[#07090e]/80 border border-slate-800/60">
            {phase === 'ping' ? (
              <span>JITTER: <strong className="text-slate-200">{jitterMs !== undefined ? `${jitterMs} ms` : '--'}</strong></span>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <span className="text-purple-400">PEAK:</span>
                  <strong className="text-white">{displayPeak.toFixed(2)}</strong> {unit}
                </span>
                <span aria-hidden="true" className="text-slate-700">|</span>
                <span className="text-cyan-400 font-semibold">{progressPct.toFixed(0)}%</span>
              </>
            )}
          </div>

          {/* Sub-Tier Classification */}
          <div className="mt-1.5 text-[9px] font-mono-data tracking-widest uppercase text-slate-500">
            [{theme.tier}]
          </div>
        </div>
      </div>
    </div>
  );
};
