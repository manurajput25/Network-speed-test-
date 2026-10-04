import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface PWAInstallPromptProps {
  variant?: 'button' | 'banner' | 'modal-only';
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // If already running as an installed PWA, hide everything
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General instructions modal for browsers that don't support beforeinstallprompt yet
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* 1. Header / Navbar Action Button */}
      {variant === 'button' && (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-data font-bold text-cyan-950 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 shadow-sm dark:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Install VelocityNet as an App on your phone or PC"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-950 shrink-0" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {/* 2. Floating Mobile Banner (Bottom Sheet style) */}
      {variant === 'banner' && !bannerDismissed && (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-md bg-white dark:bg-[#090d16] border border-cyan-500/40 dark:border-cyan-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-metric-card-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Download className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-display uppercase tracking-wider text-slate-900 dark:text-white">
                  Install VelocityNet App
                </h4>
                <button
                  onClick={() => setBannerDismissed(true)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                Phone me direct install karein — 1-tap home screen access aur full-screen native app experience ke sath.
              </p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono-data font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 transition-all cursor-pointer shadow-sm"
                >
                  {isIOS ? 'iOS Guide' : 'Install Now'}
                </button>
                <button
                  onClick={() => setBannerDismissed(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono-data text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. iOS Safari & Mobile Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-cyan-500/30 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center text-white mb-3 shadow-lg">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
              Install on Mobile Phone
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Follow these simple steps to add VelocityNet to your phone's Home Screen as a native app:
            </p>

            <div className="space-y-3 mt-4 text-xs font-mono-data">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="p-1 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">1. Share Menu</strong>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Safari ya Chrome me niche <strong>Share (शेयर)</strong> button par tap karein.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="p-1 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">2. Add to Home Screen</strong>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Menu scroll karein aur <strong>'Add to Home Screen'</strong> (होम स्क्रीन में जोड़ें) select karein.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">3. Tap 'Add'</strong>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Top-right me <strong>'Add'</strong> dabayein. App icon aapke mobile par create ho jayega!
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono-data font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
