import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { ThemeMode, ResolvedTheme } from '../types/theme';

interface ThemeSwitcherProps {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  onThemeChange: (theme: ThemeMode) => void;
  compact?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  theme,
  resolvedTheme,
  onThemeChange,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getActiveIcon = () => {
    if (theme === 'system') {
      return <Laptop className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />;
    }
    if (theme === 'light') {
      return <Sun className="w-4 h-4 text-amber-500" />;
    }
    return <Moon className="w-4 h-4 text-cyan-400" />;
  };

  if (compact) {
    return (
      <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => onThemeChange('dark')}
          className={`p-1.5 rounded-md transition-all cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800 text-cyan-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
          }`}
          title="Dark Theme"
        >
          <Moon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onThemeChange('light')}
          className={`p-1.5 rounded-md transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-white text-amber-600 shadow-xs'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
          }`}
          title="Bright / Light Theme"
        >
          <Sun className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onThemeChange('system')}
          className={`p-1.5 rounded-md transition-all cursor-pointer ${
            theme === 'system'
              ? 'bg-white dark:bg-slate-800 text-cyan-500 dark:text-cyan-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
          }`}
          title="System Auto Theme"
        >
          <Laptop className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer shadow-xs"
        title={`Current Theme: ${theme.toUpperCase()} (${resolvedTheme} active)`}
      >
        {getActiveIcon()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0e17] p-1.5 shadow-xl z-50">
          <button
            onClick={() => {
              onThemeChange('dark');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-100 dark:bg-cyan-500/15 text-slate-900 dark:text-cyan-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              Dark
            </span>
            {theme === 'dark' && <Check className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />}
          </button>

          <button
            onClick={() => {
              onThemeChange('light');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              Bright
            </span>
            {theme === 'light' && <Check className="w-3.5 h-3.5 text-amber-500" />}
          </button>

          <button
            onClick={() => {
              onThemeChange('system');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              theme === 'system'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-cyan-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Laptop className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              System
            </span>
            {theme === 'system' && <Check className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />}
          </button>
        </div>
      )}
    </div>
  );
};
