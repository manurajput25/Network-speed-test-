import React, { useMemo } from 'react';
import { TestPhase } from '../types/speedtest';
import { ArrowDown, ArrowUp, Monitor, Smartphone, Tablet, Laptop, Sliders, Thermometer } from 'lucide-react';
import { DeviceTelemetryInfo } from '../utils/device-detection';
import { WeatherInfo } from '../utils/location';
import { DeviceThermalTelemetry } from '../utils/device-thermals';

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
  resolvedTheme?: 'dark' | 'light';
  scaleRange?: 'auto' | '50' | '100' | '250' | '500' | '1000';
  onScaleRangeChange?: (range: 'auto' | '50' | '100' | '250' | '500' | '1000') => void;
  deviceInfo?: DeviceTelemetryInfo | null;
  weather?: WeatherInfo | null;
  deviceThermals?: DeviceThermalTelemetry | null;
  tempUnit?: 'C' | 'F';
  onToggleTempUnit?: () => void;
}

interface ScaleDefinition {
  maxVal: number;
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
  resolvedTheme = 'dark',
  scaleRange = 'auto',
  onScaleRangeChange,
  deviceInfo,
  weather,
  deviceThermals,
  tempUnit = 'C',
  onToggleTempUnit,
}) => {
  const isDark = resolvedTheme === 'dark';

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
    const relevantPeak = phase === 'completed' && completedView === 'upload'
      ? (uploadMbps || peakSpeedMbps)
      : peakSpeedMbps;
    return convertSpeed(relevantPeak, unit);
  }, [peakSpeedMbps, uploadMbps, phase, completedView, unit]);

  // Determine Dynamic Auto-Ranging Scale Tier based on active speed and peak
  const effectiveSpeedForScale = useMemo(() => {
    return Math.max(activeSpeedMbps, peakSpeedMbps, downloadMbps, uploadMbps, 1);
  }, [activeSpeedMbps, peakSpeedMbps, downloadMbps, uploadMbps]);

  // Calibrated scale definition that matches user's network speed range
  const scaleDef: ScaleDefinition = useMemo(() => {
    let targetMbps = 1000;

    if (scaleRange !== 'auto') {
      targetMbps = parseInt(scaleRange, 10) || 1000;
    } else {
      if (effectiveSpeedForScale <= 35) {
        targetMbps = 50;
      } else if (effectiveSpeedForScale <= 85) {
        targetMbps = 100;
      } else if (effectiveSpeedForScale <= 220) {
        targetMbps = 250;
      } else if (effectiveSpeedForScale <= 450) {
        targetMbps = 500;
      } else if (effectiveSpeedForScale <= 1000) {
        targetMbps = 1000;
      } else {
        targetMbps = 2500;
      }
    }

    if (unit === 'MB/s') {
      const maxMB = targetMbps / 8;
      if (maxMB <= 8) {
        return {
          maxVal: 6.25,
          points: [0, 1, 2, 3, 4, 5, 6.25],
          fractions: [0, 0.16, 0.32, 0.50, 0.68, 0.84, 1.00],
          subDivisions: [2, 2, 2, 2, 2, 2],
        };
      }
      if (maxMB <= 15) {
        return {
          maxVal: 12.5,
          points: [0, 2, 4, 6, 8, 10, 12.5],
          fractions: [0, 0.16, 0.32, 0.50, 0.68, 0.84, 1.00],
          subDivisions: [2, 2, 2, 2, 2, 2],
        };
      }
      if (maxMB <= 35) {
        return {
          maxVal: 31.25,
          points: [0, 5, 10, 15, 20, 25, 31.25],
          fractions: [0, 0.16, 0.32, 0.50, 0.68, 0.84, 1.00],
          subDivisions: [2, 2, 2, 2, 2, 2],
        };
      }
      if (maxMB <= 70) {
        return {
          maxVal: 62.5,
          points: [0, 10, 20, 30, 40, 50, 62.5],
          fractions: [0, 0.16, 0.32, 0.50, 0.68, 0.84, 1.00],
          subDivisions: [2, 2, 2, 2, 2, 2],
        };
      }
      return {
        maxVal: 125,
        points: [0, 15, 30, 50, 75, 100, 125],
        fractions: [0, 0.12, 0.25, 0.44, 0.65, 0.84, 1.00],
        subDivisions: [2, 2, 2, 2, 2, 2],
      };
    }

    if (unit === 'Gbps') {
      const maxGb = targetMbps / 1000;
      if (maxGb <= 0.1) {
        return {
          maxVal: 0.1,
          points: [0, 0.02, 0.04, 0.06, 0.08, 0.1],
          fractions: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
          subDivisions: [2, 2, 2, 2, 2],
        };
      }
      if (maxGb <= 0.5) {
        return {
          maxVal: 0.5,
          points: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
          fractions: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
          subDivisions: [2, 2, 2, 2, 2],
        };
      }
      return {
        maxVal: 1.0,
        points: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
        fractions: [0, 0.12, 0.30, 0.55, 0.78, 1.0],
        subDivisions: [2, 2, 2, 2, 2],
      };
    }

    // Default Mbps Units
    if (targetMbps === 50) {
      return {
        maxVal: 50,
        points: [0, 5, 10, 20, 30, 40, 50],
        fractions: [0, 0.12, 0.25, 0.48, 0.68, 0.85, 1.00],
        subDivisions: [2, 2, 2, 2, 2, 2],
      };
    }
    if (targetMbps === 100) {
      return {
        maxVal: 100,
        points: [0, 10, 25, 50, 75, 100],
        fractions: [0, 0.14, 0.32, 0.60, 0.82, 1.00],
        subDivisions: [2, 2, 2, 2, 2],
      };
    }
    if (targetMbps === 250) {
      return {
        maxVal: 250,
        points: [0, 25, 50, 100, 175, 250],
        fractions: [0, 0.14, 0.30, 0.58, 0.80, 1.00],
        subDivisions: [2, 2, 2, 2, 2],
      };
    }
    if (targetMbps === 500) {
      return {
        maxVal: 500,
        points: [0, 50, 100, 200, 350, 500],
        fractions: [0, 0.14, 0.30, 0.58, 0.80, 1.00],
        subDivisions: [2, 2, 2, 2, 2],
      };
    }
    if (targetMbps === 2500) {
      return {
        maxVal: 2500,
        points: [0, 250, 500, 1000, 1750, 2500],
        fractions: [0, 0.14, 0.30, 0.58, 0.80, 1.00],
        subDivisions: [2, 2, 2, 2, 2],
      };
    }
    // Standard 1000 Mbps
    return {
      maxVal: 1000,
      points: [0, 50, 100, 250, 500, 750, 1000],
      fractions: [0, 0.10, 0.22, 0.45, 0.70, 0.86, 1.00],
      subDivisions: [2, 2, 2, 2, 2, 2],
    };
  }, [scaleRange, effectiveSpeedForScale, unit]);

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

  // Pin Angle strictly centered on (cx, cy)
  const needleAngle = startAngleDeg + ratio * sweepAngleDeg;

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

  // Dynamic Speed Tier Classification
  const getDynamicTier = (speed: number) => {
    if (speed >= 800) return 'GIGABIT+ ULTRA FIBER';
    if (speed >= 400) return 'ULTRA HIGH SPEED FIBER';
    if (speed >= 150) return 'HIGH SPEED BROADBAND';
    if (speed >= 50) return 'STANDARD BROADBAND';
    if (speed >= 20) return 'MODERATE BROADBAND / 4G';
    if (speed > 0) return 'BASIC LOW-BANDWIDTH LINK';
    return 'STANDBY READY';
  };

  // Color theme
  const isUploadActive = phase === 'upload' || (phase === 'completed' && completedView === 'upload');

  const getPhaseTheme = () => {
    switch (phase) {
      case 'ping':
        return {
          primary: isDark ? '#38bdf8' : '#0284c7',
          glow: isDark ? 'rgba(56, 189, 248, 0.6)' : 'rgba(2, 132, 199, 0.3)',
          ambient: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.08)',
          label: 'MEASURING LATENCY',
          tier: pingMs && pingMs < 20 ? 'ULTRA LOW LATENCY' : 'MEASURING JITTER',
          colorClass: isDark ? 'text-sky-400' : 'text-sky-600',
        };
      case 'download':
        return {
          primary: isDark ? '#00f0ff' : '#0284c7',
          glow: isDark ? 'rgba(0, 240, 255, 0.65)' : 'rgba(2, 132, 199, 0.35)',
          ambient: isDark ? 'rgba(0, 240, 255, 0.2)' : 'rgba(2, 132, 199, 0.08)',
          label: 'STREAMING DOWNLOAD',
          tier: getDynamicTier(activeSpeedMbps),
          colorClass: isDark ? 'text-[#00f0ff]' : 'text-cyan-700',
        };
      case 'upload':
        return {
          primary: isDark ? '#10e599' : '#059669',
          glow: isDark ? 'rgba(16, 229, 153, 0.65)' : 'rgba(5, 150, 105, 0.35)',
          ambient: isDark ? 'rgba(16, 229, 153, 0.2)' : 'rgba(5, 150, 105, 0.08)',
          label: 'BUFFERING UPLOAD',
          tier: activeSpeedMbps > 100 ? 'GIGABIT UPSTREAM' : activeSpeedMbps > 30 ? 'HIGH-SPEED UPSTREAM' : 'STANDARD UPSTREAM',
          colorClass: isDark ? 'text-[#10e599]' : 'text-emerald-700',
        };
      case 'completed':
        return {
          primary: isUploadActive ? (isDark ? '#10e599' : '#059669') : (isDark ? '#00f0ff' : '#0284c7'),
          glow: isUploadActive ? (isDark ? 'rgba(16, 229, 153, 0.5)' : 'rgba(5, 150, 105, 0.25)') : (isDark ? 'rgba(0, 240, 255, 0.5)' : 'rgba(2, 132, 199, 0.25)'),
          ambient: isDark ? 'rgba(0, 240, 255, 0.12)' : 'rgba(2, 132, 199, 0.05)',
          label: isUploadActive ? 'UPLOAD RESULT' : 'DOWNLOAD RESULT',
          tier: getDynamicTier(isUploadActive ? uploadMbps : downloadMbps),
          colorClass: isUploadActive ? (isDark ? 'text-[#10e599]' : 'text-emerald-700') : (isDark ? 'text-[#00f0ff]' : 'text-cyan-700'),
        };
      case 'error':
        return {
          primary: '#ff3366',
          glow: 'rgba(255, 51, 102, 0.6)',
          ambient: 'rgba(255, 51, 102, 0.15)',
          label: 'CONNECTION TIMEOUT',
          tier: 'NETWORK ERROR',
          colorClass: 'text-rose-500',
        };
      default:
        return {
          primary: isDark ? '#475569' : '#0284c7',
          glow: 'transparent',
          ambient: 'transparent',
          label: 'STANDBY READY',
          tier: downloadMbps > 0 ? getDynamicTier(downloadMbps) : 'CALIBRATED & READY',
          colorClass: isDark ? 'text-slate-400' : 'text-slate-600',
        };
    }
  };

  const theme = getPhaseTheme();

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'laptop':
        return <Laptop className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'desktop':
      default:
        return <Monitor className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-[440px] mx-auto">
      {/* Dynamic Device Badge Pill */}
      {deviceInfo && (
        <div className="mb-2 px-3.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-cyan-500/30 text-xs font-mono-data text-slate-800 dark:text-cyan-300 flex items-center gap-2 shadow-xs backdrop-blur-md">
          {getDeviceIcon(deviceInfo.deviceType)}
          <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px]">DEVICE:</span>
          <span className="font-bold truncate max-w-[220px] sm:max-w-xs">{deviceInfo.deviceName}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-semibold">
            {deviceInfo.deviceType}
          </span>
        </div>
      )}

      {/* Futuristic Telemetry HUD Speedometer */}
      <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] flex items-center justify-center">
        {/* Ambient Backlight Halo */}
        <div
          className="absolute inset-4 rounded-full transition-all duration-700 pointer-events-none blur-3xl opacity-40"
          style={{ backgroundColor: theme.ambient }}
        />

        <svg
          viewBox="0 0 400 400"
          className="w-full h-full drop-shadow-md dark:drop-shadow-2xl overflow-hidden rounded-full"
        >
          <defs>
            {/* Neon Glow Filters */}
            <filter id="neonBeamGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur1" />
              <feGaussianBlur stdDeviation="7" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Dial Face Gradients */}
            <radialGradient id="dialFaceGradLight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="75%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </radialGradient>
            <radialGradient id="dialFaceGradDark" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0c1220" />
              <stop offset="75%" stopColor="#070b14" />
              <stop offset="100%" stopColor="#030509" />
            </radialGradient>

            {/* Dial Track Gradients */}
            <linearGradient id="cyberTrackGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isDark ? '#1e293b' : '#cbd5e1'} stopOpacity="0.8" />
              <stop offset="100%" stopColor={isDark ? '#334155' : '#e2e8f0'} stopOpacity="0.5" />
            </linearGradient>

            <linearGradient id="activeArcGradDownload" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            <linearGradient id="activeArcGradUpload" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10e599" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>

          {/* 1. Main Dial Plate Face */}
          <circle
            cx={cx}
            cy={cy}
            r="192"
            fill={isDark ? 'url(#dialFaceGradDark)' : 'url(#dialFaceGradLight)'}
            stroke={isDark ? '#1e293b' : '#e2e8f0'}
            strokeWidth="1.5"
          />

          {/* 2. Outer Concentric Precision Rims */}
          <circle
            cx={cx}
            cy={cy}
            r="184"
            fill="none"
            stroke={isDark ? '#334155' : '#cbd5e1'}
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity={isDark ? 0.5 : 0.7}
          />
          <circle
            cx={cx}
            cy={cy}
            r="174"
            fill="none"
            stroke={isDark ? '#1e293b' : '#e2e8f0'}
            strokeWidth="0.75"
          />

          {/* 3. Base Background Arc Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="url(#cyberTrackGrad)"
            strokeWidth="13"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform={`rotate(${startAngleDeg} ${cx} ${cy})`}
          />

          {/* 4. Active Swept Bandwidth Arc */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={isUploadActive ? 'url(#activeArcGradUpload)' : 'url(#activeArcGradDownload)'}
            strokeWidth="13"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter={isDark ? 'url(#neonBeamGlow)' : undefined}
            transform={`rotate(${startAngleDeg} ${cx} ${cy})`}
            className="transition-all duration-150 ease-out"
          />

          {/* 5. Minor Intermediate Ticks */}
          {minorTicks.map((tick, i) => {
            const isFilled = ratio >= tick.frac;
            const x1 = cx + (radius - 11) * Math.cos(tick.rad);
            const y1 = cy + (radius - 11) * Math.sin(tick.rad);
            const x2 = cx + (radius - 4) * Math.cos(tick.rad);
            const y2 = cy + (radius - 4) * Math.sin(tick.rad);

            return (
              <line
                key={`minor-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={
                  isFilled
                    ? isUploadActive
                      ? (isDark ? '#10e599' : '#059669')
                      : (isDark ? '#00f0ff' : '#0284c7')
                    : (isDark ? '#334155' : '#94a3b8')
                }
                strokeWidth="1.5"
                opacity={isFilled ? 0.95 : 0.5}
                className="transition-colors duration-150"
              />
            );
          })}

          {/* 6. Major Numerical Calibration Ticks & Numbers */}
          {majorTicks.map((tick) => {
            const isFilled = ratio >= tick.frac;
            const x1 = cx + (radius - 18) * Math.cos(tick.rad);
            const y1 = cy + (radius - 18) * Math.sin(tick.rad);
            const x2 = cx + (radius - 2) * Math.cos(tick.rad);
            const y2 = cy + (radius - 2) * Math.sin(tick.rad);

            // Numbers positioned radially inward
            const labelR = radius - 33;
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
                        ? (isDark ? '#10e599' : '#059669')
                        : (isDark ? '#00f0ff' : '#0284c7')
                      : (isDark ? '#475569' : '#64748b')
                  }
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter={isFilled && isDark ? 'url(#neonBeamGlow)' : undefined}
                  className="transition-colors duration-150"
                />
                <text
                  x={tx}
                  y={ty + 4}
                  textAnchor="middle"
                  className={`text-[12px] font-mono-data font-black transition-all duration-200 select-none ${
                    isFilled
                      ? isUploadActive
                        ? isDark ? 'fill-emerald-300 drop-shadow-[0_0_8px_rgba(16,229,153,0.9)]' : 'fill-emerald-700'
                        : isDark ? 'fill-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.9)]' : 'fill-sky-800'
                      : isDark ? 'fill-slate-500' : 'fill-slate-600'
                  }`}
                >
                  {tick.val}
                </text>
              </g>
            );
          })}

          {/* 7. Precision Automotive Forward Needle Pin (Rotates strictly around cx, cy) */}
          <g
            transform={`rotate(${needleAngle}, ${cx}, ${cy})`}
            style={{
              transition: 'transform 180ms cubic-bezier(0.18, 0.89, 0.32, 1.05)',
            }}
          >
            {/* Glowing Neon Aura along Needle */}
            <line
              x1={cx}
              y1={cy}
              x2={cx + radius}
              y2={cy}
              stroke={isUploadActive ? '#10e599' : (isDark ? '#00f0ff' : '#0284c7')}
              strokeWidth="5"
              strokeOpacity={isDark ? 0.45 : 0.25}
              filter={isDark ? 'url(#needleGlow)' : undefined}
            />

            {/* Precision Tapered Needle Blade */}
            <polygon
              points={`${cx + radius},${cy} ${cx + radius - 18},${cy - 2} ${cx + 12},${cy - 3.5} ${cx + 12},${cy + 3.5} ${cx + radius - 18},${cy + 2}`}
              fill={isUploadActive ? (isDark ? '#10e599' : '#059669') : (isDark ? '#00f0ff' : '#0284c7')}
              stroke={isDark ? '#00f0ff' : '#0369a1'}
              strokeWidth={0.5}
            />

            {/* High-Gloss Center Spine */}
            <line
              x1={cx + 14}
              y1={cy}
              x2={cx + radius - 4}
              y2={cy}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Needle Tip Indicator Jewel */}
            <circle
              cx={cx + radius}
              cy={cy}
              r="3"
              fill={isUploadActive ? '#10e599' : (isDark ? '#00f0ff' : '#0284c7')}
              stroke="#ffffff"
              strokeWidth="1"
              filter={isDark ? 'url(#neonBeamGlow)' : undefined}
            />
          </g>

          {/* 8. Center Precision Pivot Hub Cap (Smoothly encases the needle base) */}
          <circle cx={cx} cy={cy} r={22} fill={isDark ? '#070c18' : '#ffffff'} stroke={isDark ? '#1e293b' : '#94a3b8'} strokeWidth="2.5" />
          <circle cx={cx} cy={cy} r={14} fill={isDark ? '#0f172a' : '#e2e8f0'} stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="1" />
          <circle
            cx={cx}
            cy={cy}
            r={6}
            fill={phase === 'idle' ? (isDark ? '#475569' : '#94a3b8') : (isUploadActive ? '#10e599' : (isDark ? '#00f0ff' : '#0284c7'))}
            filter={isDark ? 'url(#neonBeamGlow)' : undefined}
            className={phase !== 'idle' ? 'animate-pulse' : ''}
          />
        </svg>

        {/* Center Digital Telemetry HUD Readout (Integrated inside lower arch) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-28 pointer-events-none">
          {/* Phase Badge or Completed View Switcher */}
          {phase === 'completed' && onToggleCompletedView ? (
            <div className="flex items-center gap-1 mb-1 p-0.5 rounded-lg bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-sm pointer-events-auto">
              <button
                onClick={() => onToggleCompletedView('download')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono-data font-bold transition-all cursor-pointer ${
                  completedView === 'download'
                    ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDown className="w-2.5 h-2.5" />
                DL: {convertSpeed(downloadMbps, unit).toFixed(1)}
              </button>
              <button
                onClick={() => onToggleCompletedView('upload')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono-data font-bold transition-all cursor-pointer ${
                  completedView === 'upload'
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUp className="w-2.5 h-2.5" />
                UL: {convertSpeed(uploadMbps, unit).toFixed(1)}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1 px-3 py-0.5 rounded-full bg-white/90 dark:bg-slate-950/85 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md shadow-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  phase === 'download' || phase === 'upload' || phase === 'ping'
                    ? 'bg-cyan-500 dark:bg-cyan-400 animate-ping'
                    : phase === 'completed'
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : 'bg-slate-400 dark:bg-slate-600'
                }`}
              />
              <span className={`text-[10px] font-mono-data tracking-widest uppercase font-bold ${theme.colorClass}`}>
                {theme.label}
              </span>
            </div>
          )}

          {/* Main Bandwidth Numeric Readout */}
          <div className="flex items-baseline gap-2 my-0.5">
            <span className="text-5xl sm:text-6xl font-display font-black tracking-tight text-slate-900 dark:text-white tabular-nums drop-shadow-sm dark:drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              {phase === 'ping'
                ? pingMs !== undefined ? pingMs : '--'
                : phase === 'idle'
                ? '0.00'
                : displaySpeed.toFixed(2)}
            </span>
            <span className="text-sm sm:text-base font-display uppercase font-bold text-cyan-600 dark:text-cyan-400 tracking-wider">
              {phase === 'ping' ? 'ms' : unit}
            </span>
          </div>

          {/* Secondary Sub-Metric Telemetry */}
          <div className="flex items-center gap-3 text-xs font-mono-data text-slate-500 dark:text-slate-400 mt-1 px-3 py-1 rounded-md bg-white/80 dark:bg-[#07090e]/80 border border-slate-200 dark:border-slate-800/60 shadow-xs">
            {phase === 'ping' ? (
              <span>JITTER: <strong className="text-slate-800 dark:text-slate-200">{jitterMs !== undefined ? `${jitterMs} ms` : '--'}</strong></span>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">PEAK:</span>
                  <strong className="text-slate-900 dark:text-white">{displayPeak.toFixed(2)}</strong> {unit}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{progressPct.toFixed(0)}%</span>
              </>
            )}
          </div>

          {/* Dynamic Sub-Tier Classification */}
          <div className="mt-1.5 text-[9px] font-mono-data tracking-widest uppercase text-cyan-700 dark:text-cyan-400 font-bold">
            [{theme.tier}]
          </div>
        </div>
      </div>

      {/* Dial Scale Range Quick Switcher */}
      {onScaleRangeChange && (
        <div className="mt-2 flex items-center gap-1.5 p-1 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-[10px] font-mono-data shadow-xs">
          <span className="text-slate-400 dark:text-slate-500 pl-1.5 font-semibold flex items-center gap-1">
            <Sliders className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            SCALE:
          </span>
          {(['auto', '50', '100', '250', '500', '1000'] as const).map((rng) => (
            <button
              key={rng}
              onClick={() => onScaleRangeChange(rng)}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer uppercase ${
                scaleRange === rng
                  ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {rng === 'auto' ? `Auto (${scaleDef.maxVal}${unit === 'MB/s' ? 'MB' : 'M'})` : `${rng}M`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
