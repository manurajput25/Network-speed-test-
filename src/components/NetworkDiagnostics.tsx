import React from 'react';
import {
  Gamepad2,
  Tv,
  Video,
  DownloadCloud,
  Globe,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SpeedTestResult, ClientNetworkInfo } from '../types/speedtest';

interface NetworkDiagnosticsProps {
  result: SpeedTestResult | null;
  clientInfo: ClientNetworkInfo | null;
}

export const NetworkDiagnostics: React.FC<NetworkDiagnosticsProps> = ({
  result,
  clientInfo,
}) => {
  if (!result) {
    return (
      <div className="bg-[#0d121f]/90 border border-slate-800/80 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-400">
          Run a speed test to generate comprehensive network performance diagnostics and connection grading.
        </p>
      </div>
    );
  }

  const { suitability, grade, bufferbloatGrade, pingMs, loadedPingMs } = result;

  const getGradeColor = (g: string) => {
    switch (g) {
      case 'A+':
      case 'A':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'B':
        return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
      case 'C':
        return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      default:
        return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
    }
  };

  const getStatusBadge = (status: string) => {
    if (['Optimal', '4K/8K HDR', 'Crystal Clear', 'Lightning Fast'].includes(status)) {
      return 'text-emerald-400';
    }
    if (['Good', '1080p Full HD', 'Good HD', 'Fast'].includes(status)) {
      return 'text-cyan-400';
    }
    if (['Fair', '720p HD', 'Acceptable', 'Average'].includes(status)) {
      return 'text-amber-400';
    }
    return 'text-rose-400';
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Row: Grade & Bufferbloat Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Quality Rating */}
        <div className="bg-[#0d121f]/90 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl border flex items-center justify-center font-mono-data font-bold text-3xl shrink-0 ${getGradeColor(grade)}`}>
            {grade}
          </div>
          <div>
            <div className="text-xs font-mono-data text-slate-400 uppercase tracking-wide">
              Connection Rating
            </div>
            <div className="text-base font-semibold text-white mt-0.5">
              {grade === 'A+'
                ? 'Gigabit-Tier Ultra Low Latency'
                : grade === 'A'
                ? 'High-Performance Broadband'
                : grade === 'B'
                ? 'Reliable Standard Broadband'
                : 'Limited Bandwidth Connection'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Supports high-concurrency households
            </div>
          </div>
        </div>

        {/* Bufferbloat Analysis */}
        <div className="bg-[#0d121f]/90 border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono-data text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Bufferbloat Quality
            </span>
            <span className={`text-xs font-mono-data font-bold px-2 py-0.5 rounded border ${getGradeColor(bufferbloatGrade)}`}>
              Grade {bufferbloatGrade}
            </span>
          </div>
          <div className="text-sm font-semibold text-white mt-1">
            {loadedPingMs - pingMs <= 20
              ? 'Minimal Latency Spike under Load'
              : 'Moderate Latency Growth under Load'}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono-data text-slate-400 mt-2">
            <span>Unloaded: {pingMs}ms</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Loaded: {loadedPingMs}ms</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-300">Δ+{Math.max(loadedPingMs - pingMs, 0)}ms</span>
          </div>
        </div>

        {/* Network & ISP Details */}
        <div className="bg-[#0d121f]/90 border border-slate-800/80 rounded-xl p-5">
          <div className="text-xs font-mono-data text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            Observed Connection
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {clientInfo?.isp || 'Detected Internet Provider'}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono-data text-slate-400 mt-2 truncate">
            <span>IP: {clientInfo?.ip || 'Hidden'}</span>
            {clientInfo?.country && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{clientInfo.city ? `${clientInfo.city}, ` : ''}{clientInfo.country}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity Suitability Matrix */}
      <div className="bg-[#0d121f]/90 border border-slate-800/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Real-World Application Suitability
          </h3>
          <span className="text-xs font-mono-data text-slate-400">
            BASED ON LATENCY &amp; THROUGHPUT TELEMETRY
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Gaming */}
          <div className="p-3.5 rounded-lg border border-slate-800 bg-[#07090e]/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-indigo-400" />
                Online Gaming
              </span>
              <span className={`text-xs font-mono-data font-semibold ${getStatusBadge(suitability.gaming.status)}`}>
                {suitability.gaming.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {suitability.gaming.detail}
            </p>
          </div>

          {/* Streaming */}
          <div className="p-3.5 rounded-lg border border-slate-800 bg-[#07090e]/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-purple-400" />
                Media Streaming
              </span>
              <span className={`text-xs font-mono-data font-semibold ${getStatusBadge(suitability.streaming.status)}`}>
                {suitability.streaming.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {suitability.streaming.detail}
            </p>
          </div>

          {/* Video Calls */}
          <div className="p-3.5 rounded-lg border border-slate-800 bg-[#07090e]/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-400" />
                Video Conferencing
              </span>
              <span className={`text-xs font-mono-data font-semibold ${getStatusBadge(suitability.conferencing.status)}`}>
                {suitability.conferencing.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {suitability.conferencing.detail}
            </p>
          </div>

          {/* Large Downloads */}
          <div className="p-3.5 rounded-lg border border-slate-800 bg-[#07090e]/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <DownloadCloud className="w-4 h-4 text-cyan-400" />
                Heavy Transfers
              </span>
              <span className={`text-xs font-mono-data font-semibold ${getStatusBadge(suitability.downloads.status)}`}>
                {suitability.downloads.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {suitability.downloads.detail}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
