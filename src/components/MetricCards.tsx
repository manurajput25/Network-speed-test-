import React from 'react';
import { ArrowDown, ArrowUp, Activity, Radio, Zap } from 'lucide-react';
import { TestPhase } from '../types/speedtest';
import { formatBytes } from '../utils/speedtest-engine';

interface MetricCardsProps {
  phase: TestPhase;
  pingMs: number;
  jitterMs: number;
  loadedPingMs?: number;
  downloadMbps: number;
  uploadMbps: number;
  peakDownloadMbps?: number;
  peakUploadMbps?: number;
  downloadBytes?: number;
  uploadBytes?: number;
  unit: 'Mbps' | 'MB/s' | 'Gbps';
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  phase,
  pingMs,
  jitterMs,
  loadedPingMs,
  downloadMbps,
  uploadMbps,
  peakDownloadMbps,
  peakUploadMbps,
  downloadBytes = 0,
  uploadBytes = 0,
  unit,
}) => {
  const convertSpeed = (mbps: number) => {
    if (unit === 'MB/s') return (mbps / 8).toFixed(2);
    if (unit === 'Gbps') return (mbps / 1000).toFixed(3);
    return mbps.toFixed(2);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full">
      {/* 1. Ping Latency Pod */}
      <div
        className={`relative p-4 rounded-xl border transition-all duration-300 overflow-hidden shadow-xs ${
          phase === 'ping'
            ? 'border-sky-500 bg-sky-50/70 dark:bg-[#0c1427] dark:border-sky-400 shadow-md dark:shadow-[0_0_25px_rgba(56,189,248,0.25)] ring-1 ring-sky-400/40'
            : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16]/90 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 transition-opacity ${
            phase === 'ping' ? 'bg-sky-500 dark:bg-sky-400 opacity-100' : 'bg-slate-200 dark:bg-slate-800 opacity-40'
          }`}
        />

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-display tracking-wide">
            <Radio className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            LATENCY PING
          </span>
          {phase === 'ping' && (
            <span className="text-[10px] font-mono-data text-sky-600 dark:text-sky-400 font-bold animate-pulse">
              ● PROBING
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            {pingMs > 0 ? Math.round(pingMs) : '--'}
          </span>
          <span className="text-xs font-mono-data text-sky-600 dark:text-sky-400 font-semibold uppercase">ms</span>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono-data text-slate-500 dark:text-slate-400">
          <span>LOADED: <strong className="text-slate-800 dark:text-slate-200">{loadedPingMs ? `${Math.round(loadedPingMs)} ms` : '--'}</strong></span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span className={pingMs <= 20 ? 'text-emerald-600 dark:text-emerald-400' : pingMs <= 50 ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'}>
            {pingMs <= 20 ? 'Ultra Low' : pingMs <= 50 ? 'Nominal' : 'Elevated'}
          </span>
        </div>
      </div>

      {/* 2. Jitter Variance Pod */}
      <div
        className={`relative p-4 rounded-xl border transition-all duration-300 overflow-hidden shadow-xs ${
          phase === 'ping'
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-[#0c1427] dark:border-indigo-400 shadow-md dark:shadow-[0_0_25px_rgba(99,102,241,0.2)]'
            : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16]/90 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 transition-opacity ${
            phase === 'ping' ? 'bg-indigo-500 dark:bg-indigo-400 opacity-100' : 'bg-slate-200 dark:bg-slate-800 opacity-40'
          }`}
        />

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-display tracking-wide">
            <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            JITTER DRIFT
          </span>
          {jitterMs > 0 && (
            <span className="text-[10px] font-mono-data text-indigo-600 dark:text-indigo-400 font-bold">
              {jitterMs < 3 ? 'STABLE' : 'DRIFT'}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            {jitterMs > 0 ? jitterMs.toFixed(1) : '--'}
          </span>
          <span className="text-xs font-mono-data text-indigo-600 dark:text-indigo-400 font-semibold uppercase">ms</span>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono-data text-slate-500 dark:text-slate-400">
          <span>DEV: <strong className="text-slate-800 dark:text-slate-200">±{jitterMs > 0 ? (jitterMs * 0.8).toFixed(1) : '--'}</strong></span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span className={jitterMs < 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
            {jitterMs < 5 ? 'Steady Stream' : 'Variable'}
          </span>
        </div>
      </div>

      {/* 3. Download Speed Pod */}
      <div
        className={`relative p-4 rounded-xl border transition-all duration-300 overflow-hidden shadow-xs ${
          phase === 'download'
            ? 'border-cyan-500 bg-cyan-50/70 dark:bg-[#061826] dark:border-cyan-400 shadow-md dark:shadow-[0_0_30px_rgba(0,240,255,0.3)] ring-1 ring-cyan-400/50'
            : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16]/90 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 transition-opacity ${
            phase === 'download' ? 'bg-cyan-500 dark:bg-cyan-400 opacity-100 shadow-[0_0_10px_#00f0ff]' : 'bg-slate-200 dark:bg-slate-800 opacity-40'
          }`}
        />

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5 font-display tracking-wide">
            <ArrowDown className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            DOWNLOAD FLOW
          </span>
          {phase === 'download' && (
            <span className="text-[10px] font-mono-data text-cyan-600 dark:text-cyan-400 font-bold animate-pulse flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> SATURATING
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-2xl sm:text-3xl font-display font-black text-cyan-700 dark:text-cyan-300 tabular-nums tracking-tight drop-shadow-xs dark:drop-shadow-[0_0_12px_rgba(0,240,255,0.3)]">
            {downloadMbps > 0 ? convertSpeed(downloadMbps) : '--'}
          </span>
          <span className="text-xs font-mono-data text-cyan-600 dark:text-cyan-400 font-semibold uppercase">{unit}</span>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono-data text-slate-500 dark:text-slate-400">
          <span>PEAK: <strong className="text-slate-800 dark:text-white">{peakDownloadMbps ? convertSpeed(peakDownloadMbps) : '--'}</strong></span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span>{downloadBytes > 0 ? formatBytes(downloadBytes) : '0 MB'}</span>
        </div>
      </div>

      {/* 4. Upload Speed Pod */}
      <div
        className={`relative p-4 rounded-xl border transition-all duration-300 overflow-hidden shadow-xs ${
          phase === 'upload'
            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-[#061e18] dark:border-emerald-400 shadow-md dark:shadow-[0_0_30px_rgba(16,229,153,0.3)] ring-1 ring-emerald-400/50'
            : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16]/90 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 transition-opacity ${
            phase === 'upload' ? 'bg-emerald-500 dark:bg-emerald-400 opacity-100 shadow-[0_0_10px_#10e599]' : 'bg-slate-200 dark:bg-slate-800 opacity-40'
          }`}
        />

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-display tracking-wide">
            <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            UPLOAD FLOW
          </span>
          {phase === 'upload' && (
            <span className="text-[10px] font-mono-data text-emerald-600 dark:text-emerald-400 font-bold animate-pulse flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> PUSHING
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-2xl sm:text-3xl font-display font-black text-emerald-700 dark:text-emerald-300 tabular-nums tracking-tight drop-shadow-xs dark:drop-shadow-[0_0_12px_rgba(16,229,153,0.3)]">
            {uploadMbps > 0 ? convertSpeed(uploadMbps) : '--'}
          </span>
          <span className="text-xs font-mono-data text-emerald-600 dark:text-emerald-400 font-semibold uppercase">{unit}</span>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono-data text-slate-500 dark:text-slate-400">
          <span>PEAK: <strong className="text-slate-800 dark:text-white">{peakUploadMbps ? convertSpeed(peakUploadMbps) : '--'}</strong></span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span>{uploadBytes > 0 ? formatBytes(uploadBytes) : '0 MB'}</span>
        </div>
      </div>
    </div>
  );
};
