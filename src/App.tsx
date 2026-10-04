/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  RotateCcw,
  Sliders,
  Share2,
  Server,
  Globe,
  Radio,
  Zap,
  CheckCircle2,
  Shield,
  Layers,
  Volume2,
  VolumeX,
  Cpu,
  Clock,
  Sparkles,
  Wifi,
  Smartphone,
  Monitor,
  Tablet,
  Laptop,
  Calendar,
  MapPin,
  Thermometer,
  CloudSun,
} from 'lucide-react';
import {
  TestPhase,
  ServerTarget,
  ClientNetworkInfo,
  SpeedTestResult,
  TelemetryPoint,
  SpeedTestConfig,
} from './types/speedtest';
import {
  SpeedTestEngine,
  DEFAULT_SERVERS,
  fetchClientInfo,
} from './utils/speedtest-engine';
import {
  detectDeviceTelemetry,
  detectDeviceTelemetrySync,
  DeviceTelemetryInfo,
} from './utils/device-detection';
import {
  getInitialLocation,
  fetchAccurateLocation,
  requestBrowserGeolocation,
  ResolvedLocation,
} from './utils/location';
import { useDeviceThermals } from './utils/device-thermals';
import { soundManager } from './utils/audio';
import { useThemeSystem } from './utils/theme';
import { SpeedGauge } from './components/SpeedGauge';
import { MetricCards } from './components/MetricCards';
import { LiveTelemetryChart } from './components/LiveTelemetryChart';
import { NetworkDiagnostics } from './components/NetworkDiagnostics';
import { TestHistory } from './components/TestHistory';
import { ShareModal } from './components/ShareModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

export default function App() {
  const { theme, setTheme, resolvedTheme } = useThemeSystem();

  // Test State
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [peakSpeed, setPeakSpeed] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(0);

  // Live Metrics
  const [pingMs, setPingMs] = useState<number>(0);
  const [jitterMs, setJitterMs] = useState<number>(0);
  const [loadedPingMs, setLoadedPingMs] = useState<number>(0);
  const [downloadMbps, setDownloadMbps] = useState<number>(0);
  const [uploadMbps, setUploadMbps] = useState<number>(0);
  const [downloadBytes, setDownloadBytes] = useState<number>(0);
  const [uploadBytes, setUploadBytes] = useState<number>(0);

  // Telemetry Time-Series
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);

  // Results & History
  const [currentResult, setCurrentResult] = useState<SpeedTestResult | null>(null);
  const [history, setHistory] = useState<SpeedTestResult[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientNetworkInfo | null>(null);

  // Live Date & Time Clock (updating every second)
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDay = currentDateTime.toLocaleDateString(undefined, { weekday: 'long' });
  const formattedDate = currentDateTime.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = currentDateTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  // Direct Device Telemetry State (Instant 0ms detection + async high-entropy refinement)
  const [deviceInfo, setDeviceInfo] = useState<DeviceTelemetryInfo>(() => detectDeviceTelemetrySync());

  useEffect(() => {
    detectDeviceTelemetry().then((refined) => {
      setDeviceInfo(refined);
    });
  }, []);

  // Accurate User Location (Verified timezone, IP cross-check & GPS refinement)
  const [userLocation, setUserLocation] = useState<ResolvedLocation>(() => getInitialLocation());
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Temperature Unit (°C / °F toggle)
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const toggleTempUnit = () => setTempUnit((u) => (u === 'C' ? 'F' : 'C'));

  // Live Device Hardware & Silicon Thermal Monitor
  const deviceThermals = useDeviceThermals(phase, deviceInfo?.deviceType);

  useEffect(() => {
    fetchAccurateLocation().then((loc) => {
      setUserLocation(loc);
    });
  }, []);

  const handleRefineLocationGPS = async () => {
    setIsLocatingGPS(true);
    setGpsNotice(null);
    try {
      const loc = await requestBrowserGeolocation();
      setUserLocation(loc);
      setGpsNotice('Exact GPS verified');
      setTimeout(() => setGpsNotice(null), 3000);
    } catch {
      setGpsNotice('GPS permission prompt dismissed; using network location');
      setTimeout(() => setGpsNotice(null), 3000);
    } finally {
      setIsLocatingGPS(false);
    }
  };

  // Configuration
  const [config, setConfig] = useState<SpeedTestConfig>({
    server: DEFAULT_SERVERS[0],
    durationSeconds: 10,
    concurrency: 4,
    soundEnabled: true,
    unit: 'Mbps',
    scaleRange: 'auto',
  });

  // UI Drawers & Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'test' | 'diagnostics' | 'history'>('test');
  const [completedView, setCompletedView] = useState<'download' | 'upload'>('download');

  // Engine instance
  const engineRef = useRef<SpeedTestEngine>(new SpeedTestEngine());

  // Load history from localStorage & fetch client info on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('velocitynet_test_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }

    fetchClientInfo().then((info) => {
      setClientInfo(info);
    });
  }, []);

  // Sync sound setting
  useEffect(() => {
    soundManager.setEnabled(config.soundEnabled);
  }, [config.soundEnabled]);

  // Start Speed Test
  const handleStartTest = async () => {
    if (phase !== 'idle' && phase !== 'completed' && phase !== 'error') {
      // If currently testing, cancel it
      engineRef.current.cancel();
      setPhase('idle');
      return;
    }

    // Reset metrics
    setPhase('ping');
    setCompletedView('download');
    setCurrentSpeed(0);
    setPeakSpeed(0);
    setProgressPct(0);
    setPingMs(0);
    setJitterMs(0);
    setLoadedPingMs(0);
    setDownloadMbps(0);
    setUploadMbps(0);
    setDownloadBytes(0);
    setUploadBytes(0);
    setTelemetry([]);

    try {
      const result = await engineRef.current.runTest(
        config.server,
        config.durationSeconds,
        config.concurrency,
        {
          onPhaseChange: (p) => {
            setPhase(p);
          },
          onPingProgress: (p, j) => {
            setPingMs(p);
            setJitterMs(j);
          },
          onDownloadProgress: (instant, smooth, bytes, pct) => {
            setCurrentSpeed(smooth);
            setDownloadMbps(smooth);
            setDownloadBytes(bytes);
            setProgressPct(pct);
            setPeakSpeed((prev) => Math.max(prev, smooth));
          },
          onUploadProgress: (instant, smooth, bytes, pct) => {
            setCurrentSpeed(smooth);
            setUploadMbps(smooth);
            setUploadBytes(bytes);
            setProgressPct(pct);
            setPeakSpeed((prev) => Math.max(prev, smooth));
          },
          onTelemetryPoint: (pt) => {
            setTelemetry((prev) => [...prev, pt]);
          },
        }
      );

      setCurrentResult(result);
      setPhase('completed');
      setCompletedView('download');
      setCurrentSpeed(result.downloadMbps);
      setDownloadMbps(result.downloadMbps);
      setUploadMbps(result.uploadMbps);
      setPeakSpeed(result.peakDownloadMbps);

      if (result.clientInfo) {
        setClientInfo(result.clientInfo);
      }

      // Save to history
      setHistory((prev) => {
        const updated = [result, ...prev.slice(0, 29)];
        try {
          localStorage.setItem('velocitynet_test_history', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch (err) {
      if (phase !== 'idle') {
        setPhase('error');
      }
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('velocitynet_test_history');
    } catch {}
  };

  const isTesting = phase === 'ping' || phase === 'download' || phase === 'upload';

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />;
      case 'laptop':
        return <Laptop className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />;
      case 'desktop':
      default:
        return <Monitor className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#06080e] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-900 dark:selection:text-cyan-200 transition-colors duration-200 relative overflow-x-hidden">
      {/* Background Ambient Glows & Cyber Matrix */}
      {resolvedTheme === 'dark' ? (
        <>
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,240,255,0.15),rgba(255,255,255,0))] pointer-events-none" />
          <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_70%)] pointer-events-none" />
          <div className="fixed inset-0 bg-[linear-gradient(to_right,#0d1527_1px,transparent_1px),linear-gradient(to_bottom,#0d1527_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />
        </>
      ) : (
        <>
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.08),transparent_70%)] pointer-events-none" />
          <div className="fixed inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
        </>
      )}

      {/* Top Bar Contract: Zone 1 (Single Brand element) - Zone 2 (4-6 Clean text links) - Zone 3 (1-2 Primary actions) */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-cyan-500/20 bg-white/80 dark:bg-[#06080e]/85 backdrop-blur-xl shadow-xs dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Zone 1: Single text wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('test');
            }}
            className="text-lg font-bold tracking-wider font-display flex items-center gap-2 group cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_10px_#00f0ff] animate-pulse" />
            <span className="bg-gradient-to-r from-slate-900 via-cyan-800 to-cyan-600 dark:from-white dark:via-cyan-100 dark:to-cyan-400 bg-clip-text text-transparent group-hover:drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] transition-all">
              VELOCITYNET
            </span>
          </a>

          {/* Zone 2: 4-5 Clean nav links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-mono-data tracking-wide uppercase">
            <button
              onClick={() => setActiveTab('test')}
              className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer py-1 ${
                activeTab === 'test' ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 dark:border-cyan-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Speed Cockpit
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer py-1 ${
                activeTab === 'diagnostics' ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 dark:border-cyan-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Diagnostics
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer py-1 ${
                activeTab === 'history' ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 dark:border-cyan-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Logs ({history.length})
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer py-1"
            >
              Edge Nodes
            </button>
          </nav>

          {/* Zone 3: Primary Actions & Theme Switcher */}
          <div className="flex items-center gap-2">
            {/* Theme Switcher */}
            <ThemeSwitcher
              theme={theme}
              resolvedTheme={resolvedTheme}
              onThemeChange={setTheme}
            />

            {/* Audio Toggle Button */}
            <button
              onClick={() => setConfig({ ...config, soundEnabled: !config.soundEnabled })}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                config.soundEnabled
                  ? 'border-cyan-500/40 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title={config.soundEnabled ? 'Completion Chime Active (Mute)' : 'Audio Muted (Unmute)'}
            >
              {config.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Settings Drawer Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-cyan-300 bg-white/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition-colors cursor-pointer shadow-xs"
              title="Test configuration & Edge nodes"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* PWA Direct Mobile/Desktop App Install */}
            <PWAInstallPrompt variant="button" />

            {currentResult && (
              <button
                onClick={() => setIsShareOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-data text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 rounded-lg border border-cyan-300 dark:border-cyan-500/40 transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Export
              </button>
            )}

            <button
              onClick={handleStartTest}
              className={`px-4 py-1.5 text-xs font-display font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                isTesting
                  ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/50 shadow-xs'
                  : 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-md dark:shadow-[0_0_20px_rgba(0,240,255,0.5)] hover:scale-[1.02]'
              }`}
            >
              {isTesting ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  ABORT
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {currentResult ? 'RESCAN' : 'ENGAGE'}
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7 relative z-10">
        {/* Mobile Navigation Segmented Tabs */}
        <div className="flex md:hidden items-center justify-center p-1 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            onClick={() => setActiveTab('test')}
            className={`flex-1 py-1.5 text-xs font-mono-data uppercase font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'test' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Cockpit
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex-1 py-1.5 text-xs font-mono-data uppercase font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'diagnostics' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 text-xs font-mono-data uppercase font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'history' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Logs
          </button>
        </div>

        {/* View 1: Main Speed Test Cockpit */}
        {activeTab === 'test' && (
          <div className="space-y-7">
            {/* Top Telemetry Context Ribbon: Date, Day, Time, Location, Node, Device & ISP */}
            <div className="rounded-xl bg-white dark:bg-[#090d16]/95 border border-slate-200 dark:border-cyan-500/20 shadow-xs dark:shadow-lg text-xs font-mono-data divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden relative">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 via-sky-400 to-indigo-500" />

              {/* Sub-bar 1: Live Day, Date & Time + Detected Location */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/70 dark:bg-[#070b14]/70 pl-5">
                {/* Live Day, Date & Time */}
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formattedDay}, {formattedDate}
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <div className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400 font-bold tabular-nums">
                    <Clock className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span>{formattedTime}</span>
                  </div>
                </div>

                {/* Detected Accurate Location & Ambient Weather Temperature */}
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                    <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px]">LOCATION:</span>
                    <button
                      onClick={handleRefineLocationGPS}
                      className="font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Click to refine location with high-accuracy GPS"
                    >
                      <span>{userLocation.formatted}</span>
                      {isLocatingGPS ? (
                        <RotateCcw className="w-3 h-3 text-cyan-500 animate-spin" />
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100/70 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700/50 uppercase font-semibold">
                          {userLocation.source === 'gps' ? 'GPS' : 'Refine'}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Place Live Temperature & Weather */}
                  {userLocation.weather ? (
                    <button
                      onClick={toggleTempUnit}
                      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold cursor-pointer hover:bg-amber-500/20 transition-all text-xs"
                      title={`Weather in ${userLocation.city}: ${userLocation.weather.condition}. Click to switch °C/°F`}
                    >
                      <span className="text-sm">{userLocation.weather.icon}</span>
                      <span className="font-bold tabular-nums">
                        {tempUnit === 'C' ? `${userLocation.weather.temperatureC}°C` : `${userLocation.weather.temperatureF}°F`}
                      </span>
                      <span className="text-[10px] text-amber-600/90 dark:text-amber-400/90 font-normal hidden sm:inline">
                        {userLocation.weather.condition}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono-data">
                      <CloudSun className="w-3.5 h-3.5 text-amber-500/70 animate-pulse" />
                      <span>Detecting temp...</span>
                    </div>
                  )}

                  {gpsNotice && (
                    <span className="text-[10px] font-mono-data text-cyan-600 dark:text-cyan-400 animate-pulse">
                      ({gpsNotice})
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-bar 2: Active Server Node, Device + Thermal, & ISP/IP */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 pl-5">
                {/* Left: Active Server Quick Switch */}
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 shrink-0">
                  <Server className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase">NODE:</span>
                  <div className="flex items-center gap-1.5">
                    {DEFAULT_SERVERS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setConfig({ ...config, server: s })}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono-data transition-all cursor-pointer whitespace-nowrap ${
                          config.server.id === s.id
                            ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/50 shadow-xs font-semibold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {s.name.replace('Global ', '').replace(' Node', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Middle: Active Testing Device & Hardware Silicon Temperature */}
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {getDeviceIcon(deviceInfo.deviceType)}
                    <span className="text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase">DEVICE:</span>
                    <span className="text-slate-900 dark:text-white font-bold truncate max-w-[200px] sm:max-w-xs" title={deviceInfo.deviceName}>
                      {deviceInfo.deviceName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 uppercase font-semibold">
                      {deviceInfo.deviceType}
                    </span>
                  </div>

                  {/* Device Thermal Telemetry Badge */}
                  <button
                    onClick={toggleTempUnit}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs font-mono-data cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    title={`Device Silicon Thermal State: ${deviceThermals.summary}. Estimated CPU Load: ${deviceThermals.cpuLoadPct}%. Click to toggle °C/°F`}
                  >
                    <Thermometer className={`w-3.5 h-3.5 ${deviceThermals.statusColor} shrink-0`} />
                    <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px]">TEMP:</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {tempUnit === 'C' ? `${deviceThermals.tempC}°C` : `${deviceThermals.tempF}°F`}
                    </span>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                      deviceThermals.status === 'OPTIMAL'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : deviceThermals.status === 'ELEVATED LOAD'
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {deviceThermals.status}
                    </span>
                  </button>
                </div>

                {/* Right: Client IP & ISP */}
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase">ISP:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-xs">
                    {clientInfo?.isp || 'Broadband Network'}
                  </span>
                  {clientInfo?.ip && (
                    <>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-cyan-700 dark:text-cyan-400 font-semibold">{clientInfo.ip}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Central Speedometer Dial Stage */}
            <div className="relative flex flex-col items-center justify-center py-2 sm:py-4">
              <SpeedGauge
                speedMbps={currentSpeed}
                peakSpeedMbps={peakSpeed}
                unit={config.unit}
                phase={phase}
                progressPct={progressPct}
                pingMs={pingMs}
                jitterMs={jitterMs}
                downloadMbps={currentResult?.downloadMbps || downloadMbps}
                uploadMbps={currentResult?.uploadMbps || uploadMbps}
                completedView={completedView}
                onToggleCompletedView={setCompletedView}
                resolvedTheme={resolvedTheme}
                scaleRange={config.scaleRange || 'auto'}
                onScaleRangeChange={(rng) => setConfig({ ...config, scaleRange: rng })}
                deviceInfo={deviceInfo}
                weather={userLocation.weather}
                deviceThermals={deviceThermals}
                tempUnit={tempUnit}
                onToggleTempUnit={toggleTempUnit}
              />

              {/* Cyber Central Launch Button */}
              <div className="mt-4 flex flex-col items-center justify-center">
                <button
                  onClick={handleStartTest}
                  disabled={isTesting}
                  className={`group relative px-9 py-4 rounded-2xl font-black font-display text-base tracking-widest uppercase transition-all duration-300 cursor-pointer flex items-center gap-3 overflow-hidden ${
                    isTesting
                      ? 'bg-slate-200 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700/80'
                      : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500 text-slate-950 shadow-lg dark:shadow-[0_0_35px_rgba(0,240,255,0.6)] hover:scale-105 active:scale-95'
                  }`}
                >
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

                  {isTesting ? (
                    <>
                      <RotateCcw className="w-5 h-5 animate-spin text-cyan-600 dark:text-cyan-400" />
                      <span>SATURATING LINK ({progressPct.toFixed(0)}%)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current text-slate-950" />
                      <span>{currentResult ? 'INITIATE RESCAN' : 'ENGAGE SPEED SCAN'}</span>
                    </>
                  )}
                </button>

                {/* Sub-bar Quick Controls */}
                <div className="mt-3.5 flex items-center gap-3 text-xs font-mono-data text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <button
                      onClick={() => setConfig({ ...config, durationSeconds: config.durationSeconds === 10 ? 5 : config.durationSeconds === 5 ? 20 : 10 })}
                      className="hover:text-cyan-700 dark:hover:text-cyan-300 underline decoration-dotted transition-colors cursor-pointer"
                    >
                      {config.durationSeconds}s Scan
                    </button>
                  </div>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <button
                      onClick={() => setConfig({ ...config, concurrency: config.concurrency === 4 ? 8 : config.concurrency === 8 ? 1 : 4 })}
                      className="hover:text-cyan-700 dark:hover:text-cyan-300 underline decoration-dotted transition-colors cursor-pointer"
                    >
                      {config.concurrency}x Streams
                    </button>
                  </div>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    onClick={() => setConfig({ ...config, unit: config.unit === 'Mbps' ? 'MB/s' : config.unit === 'MB/s' ? 'Gbps' : 'Mbps' })}
                    className="text-cyan-700 dark:text-cyan-400 font-bold hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {config.unit}
                  </button>
                </div>
              </div>
            </div>

            {/* Core 4 Metric Panels */}
            <MetricCards
              phase={phase}
              pingMs={pingMs}
              jitterMs={jitterMs}
              loadedPingMs={loadedPingMs}
              downloadMbps={downloadMbps}
              uploadMbps={uploadMbps}
              peakDownloadMbps={currentResult?.peakDownloadMbps || peakSpeed}
              peakUploadMbps={currentResult?.peakUploadMbps}
              downloadBytes={downloadBytes}
              uploadBytes={uploadBytes}
              unit={config.unit}
            />

            {/* Bandwidth Oscilloscope Waveform */}
            <LiveTelemetryChart
              telemetry={telemetry}
              currentPhase={phase}
              unit={config.unit}
              resolvedTheme={resolvedTheme}
            />

            {/* Connection Diagnostics Preview */}
            {currentResult && (
              <div className="pt-2">
                <NetworkDiagnostics
                  result={currentResult}
                  clientInfo={clientInfo}
                  deviceInfo={deviceInfo}
                  weather={userLocation.weather}
                  deviceThermals={deviceThermals}
                  tempUnit={tempUnit}
                  userLocation={userLocation}
                />
              </div>
            )}
          </div>
        )}

        {/* View 2: Detailed Network Diagnostics */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-500/20 pb-4">
              <div>
                <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  Telemetry &amp; Link Health
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono-data">
                  Empirical bufferbloat, loaded latency, jitter variance, and application streaming suitability
                </p>
              </div>
              {currentResult && (
                <button
                  onClick={handleStartTest}
                  className="px-3.5 py-1.5 text-xs font-mono-data font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/40 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-all cursor-pointer shadow-xs"
                >
                  Rerun Diagnostics
                </button>
              )}
            </div>

            <NetworkDiagnostics
              result={currentResult}
              clientInfo={clientInfo}
              deviceInfo={deviceInfo}
              weather={userLocation.weather}
              deviceThermals={deviceThermals}
              tempUnit={tempUnit}
              userLocation={userLocation}
            />

            {/* Deep Technical Explanations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="p-5 rounded-xl bg-white dark:bg-[#090d16]/90 border border-slate-200 dark:border-slate-800/90 shadow-xs dark:shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-transparent" />
                <h4 className="text-sm font-semibold font-display text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  Bufferbloat &amp; Loaded Latency Dynamics
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bufferbloat occurs when network hardware queues excessive packets under heavy download or upload saturation, causing ping spikes. Low loaded latency (Grade A or A+) ensures zero game hitches or voice dropouts while other household devices download high-capacity media.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white dark:bg-[#090d16]/90 border border-slate-200 dark:border-slate-800/90 shadow-xs dark:shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent" />
                <h4 className="text-sm font-semibold font-display text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Multi-Stream Saturation Mechanics
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Modern fiber and gigabit broadband require multiple parallel TCP streams to overcome individual TCP window limits. VelocityNet automatically opens concurrent streams (1 to 8 threads) to measure the true physical bandwidth capacity of your ISP network.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View 3: Historical Records */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-500/20 pb-4">
              <div>
                <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white tracking-wide">Telemetry Archives</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono-data">
                  Locally stored test records for tracking ISP reliability and line degradation over time
                </p>
              </div>
            </div>

            {history.length > 0 ? (
              <TestHistory
                history={history}
                onClearHistory={handleClearHistory}
                onSelectResult={(res) => {
                  setCurrentResult(res);
                  setActiveTab('test');
                }}
                unit={config.unit}
              />
            ) : (
              <div className="bg-white dark:bg-[#090d16]/90 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center shadow-xs dark:shadow-2xl">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/30 flex items-center justify-center mx-auto mb-3 text-cyan-600 dark:text-cyan-400 shadow-xs">
                  <Wifi className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold font-display text-slate-900 dark:text-white">No Telemetry Logs Recorded</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Execute your first internet speed scan to automatically log latency, jitter variance, and bandwidth telemetry.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('test');
                    handleStartTest();
                  }}
                  className="mt-5 px-5 py-2.5 text-xs font-display font-bold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Initiate Scan Now
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 py-6 mt-12 bg-white dark:bg-[#04060a] relative z-10 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono-data text-slate-500">
          <div>
            <span className="text-slate-700 dark:text-slate-400 font-semibold">VELOCITYNET v3.5</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>MULTI-STREAM SPEED TELEMETRY</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Configure Nodes
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Bufferbloat Guide
            </button>
          </div>
        </div>
      </footer>

      {/* Settings & Share Modals */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onConfigChange={setConfig}
        availableServers={DEFAULT_SERVERS}
        theme={theme}
        onThemeChange={setTheme}
      />

      <ShareModal
        result={currentResult}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        unit={config.unit}
      />

      {/* Floating PWA Install Prompt for Mobile Users */}
      <PWAInstallPrompt variant="banner" />
    </div>
  );
}
