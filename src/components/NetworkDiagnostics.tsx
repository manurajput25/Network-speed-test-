import React from 'react';
import {
  Gamepad2,
  Tv,
  Video,
  DownloadCloud,
  Globe,
  ShieldCheck,
  Zap,
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { SpeedTestResult, ClientNetworkInfo } from '../types/speedtest';
import { DeviceTelemetryInfo } from '../utils/device-detection';

interface NetworkDiagnosticsProps {
  result: SpeedTestResult | null;
  clientInfo: ClientNetworkInfo | null;
  deviceInfo?: DeviceTelemetryInfo | null;
}

export const NetworkDiagnostics: React.FC<NetworkDiagnosticsProps> = ({
  result,
  clientInfo,
  deviceInfo,
}) => {
  const activeDevice = deviceInfo || result?.deviceInfo || clientInfo?.device;

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'laptop':
        return <Laptop className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
      case 'desktop':
      default:
        return <Monitor className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
    }
  };

  if (!result) {
    return (
      <div className="space-y-6">
        {/* Device Information Card even when no test has run yet */}
        {activeDevice && (
          <div className="bg-white dark:bg-[#0d121f]/90 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30">
                  {getDeviceIcon(activeDevice.deviceType)}
                </div>
                <div>
                  <div className="text-xs font-mono-data text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Testing Device Telemetry
                  </div>
                  <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                    {activeDevice.deviceName}
                  </h3>
                </div>
              </div>
              <span className="text-xs font-mono-data px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase font-semibold">
                {activeDevice.deviceType}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-data pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">OS Platform</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {activeDevice.osName} {activeDevice.osVersion}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Browser</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {activeDevice.browserName} {activeDevice.browserVersion}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Hardware Cores</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {activeDevice.cpuCores ? `${activeDevice.cpuCores} Threads` : 'Standard'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Display Resolution</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                  {activeDevice.screenResolution}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#0d121f]/90 border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 text-center shadow-xs">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Run a speed test to generate comprehensive network performance diagnostics and connection grading.
          </p>
        </div>
      </div>
    );
  }

  const { suitability, grade, bufferbloatGrade, pingMs, loadedPingMs, downloadMbps, uploadMbps, jitterMs } = result;

  const getGradeColor = (g: string) => {
    switch (g) {
      case 'A+':
      case 'A':
        return 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10';
      case 'B':
        return 'text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/40 bg-cyan-50 dark:bg-cyan-500/10';
      case 'C':
        return 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10';
      default:
        return 'text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10';
    }
  };

  const getStatusBadge = (status: string) => {
    if (['Optimal', '4K/8K HDR', 'Crystal Clear', 'Lightning Fast'].includes(status)) {
      return 'text-emerald-600 dark:text-emerald-400';
    }
    if (['Good', '1080p Full HD', 'Good HD', 'Fast'].includes(status)) {
      return 'text-cyan-600 dark:text-cyan-400';
    }
    if (['Fair', '720p HD', 'Acceptable', 'Average'].includes(status)) {
      return 'text-amber-600 dark:text-amber-400';
    }
    return 'text-rose-600 dark:text-rose-400';
  };

  // DYNAMIC Household and capacity text customized to actual tested speed
  const getCapacityDescription = (dl: number, ul: number, p: number) => {
    if (dl >= 500) {
      return 'Multi-Gigabit tier: Powers 15+ concurrent 4K/8K streams, VR headsets, and enterprise data transfers.';
    }
    if (dl >= 250) {
      return 'Ultra-High bandwidth: Supports 8–12 concurrent 4K devices, tournament gaming & heavy workstation sync.';
    }
    if (dl >= 100) {
      return 'Fast Family Broadband: Flawless for 4–6 active family members streaming 4K video, Zoom calls, and gaming.';
    }
    if (dl >= 40) {
      return 'Standard Broadband: Handles 2–4 simultaneous HD streams and general remote work meetings smoothly.';
    }
    if (dl >= 15) {
      return 'Basic Broadband: Suitable for 1–2 users; concurrent video streaming or large downloads will cause slowdowns.';
    }
    return 'Constrained Bandwidth: Best for single-device messaging and light browsing; HD streaming will buffer.';
  };

  const getBufferbloatDetail = (p: number, lp: number) => {
    const delta = Math.max(lp - p, 0);
    if (delta <= 10) {
      return 'Near-zero queue delay: Latency stays completely flat even during full saturated downloads.';
    }
    if (delta <= 25) {
      return 'Minor queue delay: Video calls and competitive games stay smooth while other devices download.';
    }
    if (delta <= 60) {
      return 'Noticeable queueing: Gaming ping may hitch slightly if another user starts a heavy download.';
    }
    return 'Severe bufferbloat: Packets queue heavily in router hardware; downloads will cause high ping lag spikes.';
  };

  return (
    <div className="space-y-6">
      {/* 1. Device Telemetry Card */}
      {activeDevice && (
        <div className="bg-white dark:bg-[#0d121f]/90 border border-slate-200 dark:border-cyan-500/30 rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-indigo-500" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pl-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 shrink-0">
                {getDeviceIcon(activeDevice.deviceType)}
              </div>
              <div>
                <div className="text-[11px] font-mono-data text-cyan-700 dark:text-cyan-400 font-semibold tracking-wider uppercase">
                  Active Device Under Test
                </div>
                <h3 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{activeDevice.deviceName}</span>
                  <span className="text-xs font-mono-data px-2 py-0.5 rounded-full bg-cyan-100/70 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-600/40 uppercase">
                    {activeDevice.deviceType}
                  </span>
                </h3>
              </div>
            </div>

            <div className="text-xs font-mono-data text-slate-500 dark:text-slate-400 sm:text-right">
              <div>OS: <strong className="text-slate-800 dark:text-slate-200">{activeDevice.osName} {activeDevice.osVersion}</strong></div>
              <div>Browser: <strong className="text-slate-800 dark:text-slate-200">{activeDevice.browserName} {activeDevice.browserVersion}</strong></div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-data pt-3 border-t border-slate-100 dark:border-slate-800/80 pl-1">
            <div className="bg-slate-50/80 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">CPU Cores</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                {activeDevice.cpuCores ? `${activeDevice.cpuCores} Threads` : 'Multi-Core'}
              </span>
            </div>
            <div className="bg-slate-50/80 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Device RAM</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                {activeDevice.deviceMemoryGb ? `≥ ${activeDevice.deviceMemoryGb} GB` : 'System RAM'}
              </span>
            </div>
            <div className="bg-slate-50/80 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Display Resolution</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-sm truncate block" title={activeDevice.screenResolution}>
                {activeDevice.screenResolution}
              </span>
            </div>
            <div className="bg-slate-50/80 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">GPU Graphic Engine</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-sm truncate block" title={activeDevice.gpuRenderer || 'Integrated Hardware'}>
                {activeDevice.gpuRenderer ? activeDevice.gpuRenderer.split(',')[0].slice(0, 22) : 'Integrated Hardware'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Summary Row: Grade & Dynamic Capacity Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Quality Rating */}
        <div className="bg-white dark:bg-[#0d121f]/90 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-xs">
          <div className={`w-16 h-16 rounded-xl border flex items-center justify-center font-mono-data font-bold text-3xl shrink-0 ${getGradeColor(grade)}`}>
            {grade}
          </div>
          <div>
            <div className="text-xs font-mono-data text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Connection Rating
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
              {downloadMbps >= 500
                ? 'Gigabit-Tier Ultra Low Latency'
                : downloadMbps >= 200
                ? 'Ultra-Fast Broadband'
                : downloadMbps >= 80
                ? 'High-Performance Broadband'
                : downloadMbps >= 30
                ? 'Standard Reliable Broadband'
                : 'Limited Bandwidth Connection'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
              {getCapacityDescription(downloadMbps, uploadMbps, pingMs)}
            </div>
          </div>
        </div>

        {/* Bufferbloat Analysis */}
        <div className="bg-white dark:bg-[#0d121f]/90 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono-data text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Bufferbloat Quality
            </span>
            <span className={`text-xs font-mono-data font-bold px-2 py-0.5 rounded border ${getGradeColor(bufferbloatGrade)}`}>
              Grade {bufferbloatGrade}
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            {loadedPingMs - pingMs <= 15
              ? 'Excellent Queue Management (No Lag Spikes)'
              : loadedPingMs - pingMs <= 40
              ? 'Moderate Queueing Under Saturation'
              : 'Significant Latency Growth Under Load'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
            {getBufferbloatDetail(pingMs, loadedPingMs)}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono-data text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Ping: {pingMs}ms</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span>Loaded: {loadedPingMs}ms</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-cyan-700 dark:text-cyan-400 font-semibold">Δ+{Math.max(loadedPingMs - pingMs, 0)}ms</span>
          </div>
        </div>

        {/* Network & ISP Details */}
        <div className="bg-white dark:bg-[#0d121f]/90 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-mono-data text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Observed Connection
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {clientInfo?.isp || 'Detected Internet Provider'}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono-data text-slate-500 dark:text-slate-400 mt-2 truncate">
            <span>IP: {clientInfo?.ip || 'Hidden'}</span>
            {clientInfo?.country && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                <span>{clientInfo.city ? `${clientInfo.city}, ` : ''}{clientInfo.country}</span>
              </>
            )}
          </div>
          <div className="text-[11px] font-mono-data text-slate-400 dark:text-slate-500 mt-2">
            Target Node: <strong className="text-slate-700 dark:text-slate-300">{result.server.name}</strong>
          </div>
        </div>
      </div>

      {/* 3. Activity Suitability Matrix */}
      <div className="bg-white dark:bg-[#0d121f]/90 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 font-display">
            <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Real-World Application Suitability Matrix
          </h3>
          <span className="text-xs font-mono-data text-slate-500 dark:text-slate-400 uppercase">
            {downloadMbps.toFixed(1)} Mbps Down · {uploadMbps.toFixed(1)} Mbps Up
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Gaming */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#07090e]/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Online Gaming
              </span>
              <span className={`text-xs font-mono-data font-semibold ${getStatusBadge(suitability.gaming.status)}`}>
                {suitability.gaming.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {suitability.gaming.detail}
            </p>
          </div>

          {/* Streaming */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#07090e]/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Media Streaming
              </span>
              <span className={`text-xs font-mono-data font-semibold ${getStatusBadge(suitability.streaming.status)}`}>
                {suitability.streaming.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {suitability.streaming.detail}
            </p>
          </div>

          {/* Video Calls */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#07090e]/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Video Conferencing
              </span>
              <span className={`text-xs font-mono-data font-semibold ${getStatusBadge(suitability.conferencing.status)}`}>
                {suitability.conferencing.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {suitability.conferencing.detail}
            </p>
          </div>

          {/* Large Downloads */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#07090e]/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <DownloadCloud className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Heavy Transfers
              </span>
              <span className={`text-xs font-mono-data font-semibold ${getStatusBadge(suitability.downloads.status)}`}>
                {suitability.downloads.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {suitability.downloads.detail}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
