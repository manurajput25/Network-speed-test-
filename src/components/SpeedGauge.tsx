import React, { useMemo } from 'react';
import { TestPhase } from '../types/speedtest';

interface SpeedGaugeProps {
  currentSpeed: number; // in selected unit or Mbps
  peakSpeed: number;
  unit: 'Mbps' | 'MB/s' | 'Gbps';
  phase: TestPhase;
  progressPct: number;
  pingMs?: number;
  jitterMs?: number;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  currentSpeed,
  peakSpeed,
  unit,
  phase,
  progressPct,
  pingMs,
  jitterMs,
}) => {
  // Determine dynamic max scale based on current or peak speed
  const maxScale = useMemo(() => {
    const reference = Math.max(currentSpeed, peakSpeed, 50);
    if (unit === 'Gbps') return 10;
    if (unit === 'MB/s') {
      if (reference > 120) return 250;
      if (reference > 60) return 125;
      if (reference > 30) return 60;
      return 30;
    }
    // Mbps
    if (reference > 500) return 1000;
    if (reference > 250) return 500;
    if (reference > 100) return 250;
    return 100;
  }, [currentSpeed, peakSpeed, unit]);

  // Major tick divisions
  const majorTicks = useMemo(() => {
    const step = maxScale / 5;
    return [0, step, step * 2, step * 3, step * 4, maxScale];
  }, [maxScale]);

  // Exact Geometry Configuration
  const cx = 200;
  const cy = 200;
  const radius = 145;
  const strokeWidth = 8;
  const startAngleDeg = 135; // 7:30 o'clock (bottom-left)
  const sweepAngleDeg = 270; // Sweeps clockwise over top to 4:30 o'clock (bottom-right)
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweepAngleDeg / 360) * circumference;

  // Fraction filled (0 to 1)
  const ratio = Math.min(Math.max(currentSpeed / maxScale, 0), 1);
  const peakRatio = Math.min(Math.max(peakSpeed / maxScale, 0), 1);

  // Exact needle angle: 135° at 0 speed, 270° at 50% speed (straight UP), 405° (45°) at max scale
  const needleAngle = startAngleDeg + ratio * sweepAngleDeg;
  const peakAngle = startAngleDeg + peakRatio * sweepAngleDeg;

  // Progress arc offset
  const strokeDashoffset = arcLength * (1 - ratio);

  // Micro-ticks array (54 ticks around the 270° sweep, 1 every 5°)
  const microTicksCount = 54;
  const microTicks = useMemo(() => {
    return Array.from({ length: microTicksCount + 1 }, (_, i) => {
      const frac = i / microTicksCount;
      const angle = startAngleDeg + frac * sweepAngleDeg;
      const rad = (angle * Math.PI) / 180;
      const isMajor = i % (microTicksCount / 5) === 0;
      return {
        index: i,
        angle,
        rad,
        frac,
        isMajor,
        val: Math.round(frac * maxScale),
      };
    });
  }, [maxScale]);

  // Segmented inner LED bars (28 bars)
  const ledBarsCount = 28;
  const ledBars = useMemo(() => {
    return Array.from({ length: ledBarsCount }, (_, i) => {
      const frac = i / (ledBarsCount - 1);
      const angle = startAngleDeg + frac * sweepAngleDeg;
      const rad = (angle * Math.PI) / 180;
      return {
        index: i,
        angle,
        rad,
        frac,
        isActive: frac <= ratio && currentSpeed > 0,
      };
    });
  }, [ratio, currentSpeed]);

  // Phase color theme and futuristic labels
  const getPhaseTheme = () => {
    switch (phase) {
      case 'ping':
        return {
          primary: '#38bdf8', // sky-400
          glow: 'rgba(56, 189, 248, 0.6)',
          ambient: 'rgba(56, 189, 248, 0.15)',
          label: 'MEASURING LATENCY',
          tier: 'QUANTUM PROBE',
          colorClass: 'text-sky-400',
        };
      case 'download':
        return {
          primary: '#00f0ff', // neon cyan
          glow: 'rgba(0, 240, 255, 0.65)',
          ambient: 'rgba(0, 240, 255, 0.2)',
          label: 'STREAMING DOWNLOAD',
          tier: currentSpeed > 400 ? 'HYPER FIBER' : currentSpeed > 100 ? 'ULTRA BROADBAND' : 'STANDARD BROADBAND',
          colorClass: 'text-[#00f0ff]',
        };
      case 'upload':
        return {
          primary: '#10e599', // neon emerald
          glow: 'rgba(16, 229, 153, 0.65)',
          ambient: 'rgba(16, 229, 153, 0.2)',
          label: 'BUFFERING UPLOAD',
          tier: currentSpeed > 100 ? 'GIGABIT UPSTREAM' : 'HIGH CAPACITY',
          colorClass: 'text-[#10e599]',
        };
      case 'completed':
        return {
          primary: '#00f0ff',
          glow: 'rgba(0, 240, 255, 0.4)',
          ambient: 'rgba(0, 240, 255, 0.12)',
          label: 'TELEMETRY LOCKED',
          tier: 'COMPLETE',
          colorClass: 'text-[#00f0ff]',
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
      <div className="relative w-[360px] h-[360px] sm:w-[400px] sm:h-[400px] flex items-center justify-center">
        {/* Dynamic Holographic Backdrop Ambient Light */}
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${theme.glow} 0%, ${theme.ambient} 45%, transparent 70%)`,
            opacity: phase === 'download' || phase === 'upload' ? 0.75 : 0.25,
            filter: 'blur(16px)',
          }}
        />

        {/* Ambient Ring Scanlines */}
        <div className="absolute inset-4 rounded-full border border-cyan-500/10 pointer-events-none" />
        <div className="absolute inset-10 rounded-full border border-indigo-500/10 pointer-events-none" />

        <svg
          className="w-full h-full transform"
          viewBox="0 0 400 400"
        >
          <defs>
            {/* Download Neon Cyan/Violet Gradient */}
            <linearGradient id="cyberDownloadGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            {/* Upload Neon Emerald/Cyan Gradient */}
            <linearGradient id="cyberUploadGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10e599" />
              <stop offset="70%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            {/* Subtle glow filter */}
            <filter id="neonBeamGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="10" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Outer Hologram Radar Ring (Dashed, rotating) */}
          <circle
            cx={cx}
            cy={cy}
            r={180}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="4 8 1 8"
            className="opacity-70"
          />

          {/* 2. Outer Technical Coordinate Corner Accents */}
          <g className="text-slate-600 text-[8px] font-mono-data">
            <text x="32" y="38" fill="#475569">SYS.NAV // 01</text>
            <text x="310" y="38" fill="#475569">BW.CAP // 10G</text>
            <text x="32" y="375" fill="#475569">FREQ: 2.4/5G</text>
            <text x="306" y="375" fill="#475569">PORT: OPTIC</text>
          </g>

          {/* 3. Outer Graduation Track Arc (Base Gray) */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#0f172a"
            strokeWidth={strokeWidth + 4}
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
            strokeWidth={strokeWidth}
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
            stroke={phase === 'upload' ? 'url(#cyberUploadGrad)' : 'url(#cyberDownloadGrad)'}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#neonBeamGlow)"
            className="transition-all duration-150 ease-out"
            transform={`rotate(${startAngleDeg} ${cx} ${cy})`}
          />

          {/* 5. 54 Micro-Ticks Around the Arc (5-degree precision) */}
          {microTicks.map((tick) => {
            const isFilled = tick.frac <= ratio && currentSpeed > 0;
            const innerR = tick.isMajor ? radius - 18 : radius - 12;
            const outerR = radius - 6;

            const x1 = cx + innerR * Math.cos(tick.rad);
            const y1 = cy + innerR * Math.sin(tick.rad);
            const x2 = cx + outerR * Math.cos(tick.rad);
            const y2 = cy + outerR * Math.sin(tick.rad);

            return (
              <line
                key={tick.index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={
                  isFilled
                    ? phase === 'upload'
                      ? '#10e599'
                      : '#00f0ff'
                    : tick.isMajor
                    ? '#334155'
                    : '#1e293b'
                }
                strokeWidth={tick.isMajor ? (isFilled ? '2' : '1.5') : '1'}
                className="transition-colors duration-150"
              />
            );
          })}

          {/* 6. Precision Scale Numerical Labels at Major Ticks */}
          {majorTicks.map((val, i) => {
            const frac = i / (majorTicks.length - 1);
            const angle = startAngleDeg + frac * sweepAngleDeg;
            const rad = (angle * Math.PI) / 180;
            const labelR = radius - 30;

            const tx = cx + labelR * Math.cos(rad);
            const ty = cy + labelR * Math.sin(rad);

            const isPassed = currentSpeed >= val && currentSpeed > 0;

            return (
              <text
                key={val}
                x={tx}
                y={ty + 4}
                textAnchor="middle"
                className={`text-[11px] font-mono-data font-bold transition-colors duration-200 ${
                  isPassed
                    ? phase === 'upload'
                      ? 'fill-emerald-400 drop-shadow-[0_0_8px_rgba(16,229,153,0.8)]'
                      : 'fill-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]'
                    : 'fill-slate-500'
                }`}
              >
                {val}
              </text>
            );
          })}

          {/* 7. Inner Curved Futuristic Segmented LED Bars */}
          {ledBars.map((bar) => {
            const innerR = 106;
            const outerR = 114;
            const x1 = cx + innerR * Math.cos(bar.rad);
            const y1 = cy + innerR * Math.sin(bar.rad);
            const x2 = cx + outerR * Math.cos(bar.rad);
            const y2 = cy + outerR * Math.sin(bar.rad);

            return (
              <line
                key={bar.index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={
                  bar.isActive
                    ? phase === 'upload'
                      ? '#10e599'
                      : '#00f0ff'
                    : '#0e1726'
                }
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-colors duration-100"
              />
            );
          })}

          {/* 8. Peak Speed Ghost Needle */}
          {peakSpeed > 0 && (
            <g
              transform={`rotate(${peakAngle} ${cx} ${cy})`}
              className="transition-transform duration-300 ease-out"
            >
              <line
                x1={cx + 60}
                y1={cy}
                x2={cx + radius - 4}
                y2={cy}
                stroke="#a855f7"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                strokeOpacity="0.75"
              />
              <circle
                cx={cx + radius - 4}
                cy={cy}
                r="2.5"
                fill="#a855f7"
                filter="url(#neonBeamGlow)"
              />
            </g>
          )}

          {/* 9. Futuristic High-Energy Laser Needle */}
          <g
            transform={`rotate(${needleAngle} ${cx} ${cy})`}
            className="transition-transform duration-100 ease-out origin-center"
          >
            {/* Laser beam glow backdrop */}
            <line
              x1={cx}
              y1={cy}
              x2={cx + radius - 8}
              y2={cy}
              stroke={phase === 'idle' ? '#475569' : theme.primary}
              strokeWidth="4"
              strokeLinecap="round"
              strokeOpacity="0.4"
              filter="url(#needleGlow)"
            />
            {/* Core razor-sharp neon needle */}
            <line
              x1={cx + 12}
              y1={cy}
              x2={cx + radius - 6}
              y2={cy}
              stroke={phase === 'idle' ? '#94a3b8' : '#ffffff'}
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Arrow chevron tip */}
            <polygon
              points={`${cx + radius - 4},${cy} ${cx + radius - 16},${cy - 4} ${cx + radius - 12},${cy} ${cx + radius - 16},${cy + 4}`}
              fill={phase === 'idle' ? '#94a3b8' : theme.primary}
              filter="url(#needleGlow)"
            />
          </g>

          {/* 10. Center Quantum Reactor Core Hub */}
          {/* Outer hub ring */}
          <circle
            cx={cx}
            cy={cy}
            r={24}
            fill="#060911"
            stroke="#1e293b"
            strokeWidth="2"
          />
          {/* Inner pulsating glow hub */}
          <circle
            cx={cx}
            cy={cy}
            r={16}
            fill="#0a101d"
            stroke={phase === 'idle' ? '#334155' : theme.primary}
            strokeWidth="1.5"
            filter="url(#neonBeamGlow)"
            className={phase !== 'idle' ? 'animate-pulse' : ''}
          />
          {/* Center core diode */}
          <circle
            cx={cx}
            cy={cy}
            r={6}
            fill={phase === 'idle' ? '#64748b' : theme.primary}
          />
        </svg>

        {/* Center Digital Telemetry HUD Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-28 pointer-events-none">
          {/* Phase Badge with Futuristic Pulsing Glyphs */}
          <div className="flex items-center gap-2 mb-1 px-3 py-0.5 rounded-full bg-slate-950/80 border border-slate-800/80 backdrop-blur-md shadow-lg">
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

          {/* Main Bandwidth Numerical Readout with Cyber Glowing Display Face */}
          <div className="flex items-baseline gap-2 my-0.5">
            <span className="text-5xl sm:text-6xl font-display font-black tracking-tight text-white tabular-nums drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              {phase === 'ping'
                ? pingMs !== undefined ? pingMs : '--'
                : phase === 'idle'
                ? '0.00'
                : currentSpeed.toFixed(2)}
            </span>
            <span className="text-sm sm:text-base font-display uppercase font-bold text-cyan-400 tracking-wider">
              {phase === 'ping' ? 'ms' : unit}
            </span>
          </div>

          {/* Futuristic Secondary Sub-Metric Telemetry */}
          <div className="flex items-center gap-3 text-xs font-mono-data text-slate-400 mt-1 px-3 py-1 rounded-md bg-[#07090e]/80 border border-slate-800/60">
            {phase === 'ping' ? (
              <span>JITTER: <strong className="text-slate-200">{jitterMs !== undefined ? `${jitterMs} ms` : '--'}</strong></span>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <span className="text-purple-400">MAX:</span>
                  <strong className="text-white">{peakSpeed.toFixed(2)}</strong> {unit}
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
