import React from 'react';
import { X, Sliders, Server, Volume2, VolumeX, Cpu, Clock, Check, Sun, Moon, Laptop } from 'lucide-react';
import { ServerTarget, SpeedTestConfig } from '../types/speedtest';
import { ThemeMode } from '../types/theme';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: SpeedTestConfig;
  onConfigChange: (newConfig: SpeedTestConfig) => void;
  availableServers: ServerTarget[];
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
  availableServers,
  theme,
  onThemeChange,
}) => {
  if (!isOpen) return null;

  const handleServerSelect = (server: ServerTarget) => {
    onConfigChange({ ...config, server });
  };

  const handleDurationSelect = (durationSeconds: number) => {
    onConfigChange({ ...config, durationSeconds });
  };

  const handleConcurrencySelect = (concurrency: number) => {
    onConfigChange({ ...config, concurrency });
  };

  const handleUnitSelect = (unit: 'Mbps' | 'MB/s' | 'Gbps') => {
    onConfigChange({ ...config, unit });
  };

  const toggleSound = () => {
    onConfigChange({ ...config, soundEnabled: !config.soundEnabled });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md h-full bg-white dark:bg-[#0b0e17] border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Telemetry Configuration</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6 mt-6">
            {/* 1. Appearance / Theme Section */}
            <div>
              <label className="text-xs font-mono-data uppercase text-slate-500 dark:text-slate-400 block mb-2.5 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Color Theme Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    theme === 'dark'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 shadow-xs font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#07090e]/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Moon className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                  <span className="text-xs">Dark</span>
                </button>

                <button
                  onClick={() => onThemeChange('light')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    theme === 'light'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-xs font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#07090e]/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs">Bright</span>
                </button>

                <button
                  onClick={() => onThemeChange('system')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    theme === 'system'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 shadow-xs font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#07090e]/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Laptop className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs">System</span>
                </button>
              </div>
            </div>

            {/* 2. Server Target Selector */}
            <div>
              <label className="text-xs font-mono-data uppercase text-slate-500 dark:text-slate-400 block mb-2.5 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Target Server Node
              </label>
              <div className="space-y-2">
                {availableServers.map((s) => {
                  const isSelected = config.server.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleServerSelect(s)}
                      className={`w-full p-3 text-left rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-slate-900 dark:text-white font-medium'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#07090e]/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">{s.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">{s.location}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Test Duration */}
            <div>
              <label className="text-xs font-mono-data uppercase text-slate-500 dark:text-slate-400 block mb-2.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Test Duration Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Quick', sec: 5, sub: '5s' },
                  { label: 'Standard', sec: 10, sub: '10s' },
                  { label: 'Sustained', sec: 20, sub: '20s' },
                ].map((d) => (
                  <button
                    key={d.sec}
                    onClick={() => handleDurationSelect(d.sec)}
                    className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                      config.durationSeconds === d.sec
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-slate-900 dark:text-white font-medium'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#07090e]/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="text-xs">{d.label}</div>
                    <div className="text-[10px] font-mono-data text-slate-500">{d.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Concurrency Streams */}
            <div>
              <label className="text-xs font-mono-data uppercase text-slate-500 dark:text-slate-400 block mb-2.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Parallel Connection Streams
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { count: 1, label: 'Single', sub: '1 Stream' },
                  { count: 4, label: 'Multi', sub: '4 Streams' },
                  { count: 8, label: 'Extreme', sub: '8 Streams' },
                ].map((c) => (
                  <button
                    key={c.count}
                    onClick={() => handleConcurrencySelect(c.count)}
                    className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                      config.concurrency === c.count
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-slate-900 dark:text-white font-medium'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#07090e]/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="text-xs">{c.label}</div>
                    <div className="text-[10px] font-mono-data text-slate-500">{c.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Display Unit */}
            <div>
              <label className="text-xs font-mono-data uppercase text-slate-500 dark:text-slate-400 block mb-2.5">
                Bandwidth Measurement Unit
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Mbps', 'MB/s', 'Gbps'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => handleUnitSelect(u)}
                    className={`py-2 px-3 rounded-lg border text-center font-mono-data text-xs transition-all cursor-pointer ${
                      config.unit === u
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#07090e]/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Sound Toggle */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {config.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <div className="text-xs font-medium text-slate-900 dark:text-white">Completion Audio Chime</div>
                  <div className="text-[11px] text-slate-500">Chime plays when check is completed</div>
                </div>
              </div>
              <button
                onClick={toggleSound}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  config.soundEnabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    config.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Apply Button */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Apply &amp; Return
          </button>
        </div>
      </div>
    </div>
  );
};
