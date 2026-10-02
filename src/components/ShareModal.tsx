import React, { useState } from 'react';
import { X, Copy, Check, Share2, ArrowDown, ArrowUp, Activity } from 'lucide-react';
import { SpeedTestResult } from '../types/speedtest';

interface ShareModalProps {
  result: SpeedTestResult | null;
  isOpen: boolean;
  onClose: () => void;
  unit: 'Mbps' | 'MB/s' | 'Gbps';
}

export const ShareModal: React.FC<ShareModalProps> = ({
  result,
  isOpen,
  onClose,
  unit,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !result) return null;

  const summaryText = `🚀 VelocityNet Speed Test Results:
⬇️ Download: ${result.downloadMbps} Mbps
⬆️ Upload: ${result.uploadMbps} Mbps
⏱️ Latency: ${result.pingMs} ms (Jitter: ${result.jitterMs} ms)
🛡️ Grade: ${result.grade}
📍 Server: ${result.server.name}
🌐 ISP: ${result.clientInfo?.isp || 'Broadband'}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0b0e17] border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-semibold text-white">Share Telemetry Report</h3>
        </div>

        {/* Visual Share Card */}
        <div className="bg-[#07090e] border border-slate-800 rounded-xl p-5 mb-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-sm font-bold tracking-tight text-white block">
                VelocityNet Telemetry
              </span>
              <span className="text-[11px] font-mono-data text-slate-500">
                {new Date(result.timestamp).toLocaleDateString()} · {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <span className="text-sm font-mono-data font-bold px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-400 bg-cyan-500/10">
              Grade {result.grade}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] font-mono-data text-slate-400 uppercase block">Download</span>
              <span className="text-xl font-mono-data font-bold text-cyan-400">
                {result.downloadMbps}
              </span>
              <span className="text-[10px] font-mono-data text-slate-500 ml-1">Mbps</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] font-mono-data text-slate-400 uppercase block">Upload</span>
              <span className="text-xl font-mono-data font-bold text-emerald-400">
                {result.uploadMbps}
              </span>
              <span className="text-[10px] font-mono-data text-slate-500 ml-1">Mbps</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono-data text-slate-400 pt-2 border-t border-slate-800/60">
            <div>Latency: <strong className="text-slate-200">{result.pingMs} ms</strong></div>
            <div>Jitter: <strong className="text-slate-200">{result.jitterMs} ms</strong></div>
          </div>

          <div className="text-[11px] text-slate-500 truncate">
            Node: {result.server.name}
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={copyToClipboard}
          className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-950" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Results Summary
            </>
          )}
        </button>
      </div>
    </div>
  );
};
