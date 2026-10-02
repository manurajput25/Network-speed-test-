import React from 'react';
import { History, Trash2, Download } from 'lucide-react';
import { SpeedTestResult } from '../types/speedtest';

interface TestHistoryProps {
  history: SpeedTestResult[];
  onClearHistory: () => void;
  onSelectResult: (result: SpeedTestResult) => void;
  unit: 'Mbps' | 'MB/s' | 'Gbps';
}

export const TestHistory: React.FC<TestHistoryProps> = ({
  history,
  onClearHistory,
  onSelectResult,
  unit,
}) => {
  const formatSpeed = (mbps: number) => {
    if (unit === 'MB/s') return `${(mbps / 8).toFixed(2)} MB/s`;
    if (unit === 'Gbps') return `${(mbps / 1000).toFixed(3)} Gbps`;
    return `${mbps.toFixed(2)} Mbps`;
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    const headers = ['Timestamp', 'Date', 'Server', 'Ping (ms)', 'Jitter (ms)', 'Download (Mbps)', 'Upload (Mbps)', 'Grade'];
    const rows = history.map((h) => [
      h.timestamp,
      new Date(h.timestamp).toISOString(),
      `"${h.server.name}"`,
      h.pingMs,
      h.jitterMs,
      h.downloadMbps,
      h.uploadMbps,
      h.grade,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `velocitynet-speedtest-history-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (history.length === 0) {
    return null;
  }

  // Calculate quick stats
  const bestDl = Math.max(...history.map((h) => h.downloadMbps));
  const bestPing = Math.min(...history.map((h) => h.pingMs));
  const avgDl = (history.reduce((acc, h) => acc + h.downloadMbps, 0) / history.length).toFixed(1);

  return (
    <div className="bg-white dark:bg-[#0d121f]/90 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 w-full shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Historical Test Telemetry</h3>
          <span className="text-xs font-mono-data text-slate-500 dark:text-slate-400">
            ({history.length} {history.length === 1 ? 'record' : 'records'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700/60 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg border border-transparent transition-colors whitespace-nowrap cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-slate-50 dark:bg-[#07090e]/60 border border-slate-200 dark:border-slate-800/70 text-xs font-mono-data">
        <div>
          <span className="text-slate-500 dark:text-slate-500 block text-[10px] uppercase">Best Download</span>
          <span className="text-cyan-700 dark:text-cyan-400 font-semibold text-sm tabular-nums">
            {formatSpeed(bestDl)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-500 block text-[10px] uppercase">Lowest Latency</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm tabular-nums">
            {bestPing} ms
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-500 block text-[10px] uppercase">Average Speed</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold text-sm tabular-nums">
            {avgDl} Mbps
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-mono-data text-[11px]">
              <th className="pb-2.5 font-medium">DATE / TIME</th>
              <th className="pb-2.5 font-medium">SERVER NODE</th>
              <th className="pb-2.5 font-medium text-right">DOWNLOAD</th>
              <th className="pb-2.5 font-medium text-right">UPLOAD</th>
              <th className="pb-2.5 font-medium text-right">PING</th>
              <th className="pb-2.5 font-medium text-center">GRADE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {history.slice(0, 10).map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelectResult(item)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors group"
              >
                <td className="py-2.5 font-mono-data text-slate-500 dark:text-slate-400">
                  {new Date(item.timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  ·{' '}
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="py-2.5 text-slate-800 dark:text-slate-300 font-medium">
                  {item.server.name}
                </td>
                <td className="py-2.5 text-right font-mono-data font-semibold text-cyan-700 dark:text-cyan-400 tabular-nums">
                  {formatSpeed(item.downloadMbps)}
                </td>
                <td className="py-2.5 text-right font-mono-data font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatSpeed(item.uploadMbps)}
                </td>
                <td className="py-2.5 text-right font-mono-data text-slate-700 dark:text-slate-300 tabular-nums">
                  {item.pingMs} ms
                </td>
                <td className="py-2.5 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono-data font-bold border ${
                      item.grade === 'A+' || item.grade === 'A'
                        ? 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'
                        : item.grade === 'B'
                        ? 'text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10'
                        : 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10'
                    }`}
                  >
                    {item.grade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
