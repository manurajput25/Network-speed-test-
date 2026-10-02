import {
  ServerTarget,
  ClientNetworkInfo,
  SpeedTestResult,
  TelemetryPoint,
  ConnectionGrade,
  ActivitySuitability,
} from '../types/speedtest';
import { soundManager } from './audio';

export const DEFAULT_SERVERS: ServerTarget[] = [
  {
    id: 'cloudflare-edge',
    name: 'Cloudflare Global Edge',
    location: 'Nearest Anycast Edge (300+ Cities)',
    provider: 'Cloudflare Edge Network',
    country: 'Global',
    type: 'cdn',
    pingUrl: 'https://speed.cloudflare.com/__down?bytes=0',
    downloadUrl: 'https://speed.cloudflare.com/__down?bytes=',
    uploadUrl: 'https://speed.cloudflare.com/__up',
  },
  {
    id: 'applet-cloud-run',
    name: 'Applet Cloud Run Node',
    location: 'Google Cloud (asia-southeast1)',
    provider: 'Google Cloud Platform',
    country: 'Singapore / Multi-Region',
    type: 'cloud',
    pingUrl: '/api/ping',
    downloadUrl: '/api/speedtest/download?bytes=',
    uploadUrl: '/api/speedtest/upload',
  },
  {
    id: 'fastly-edge',
    name: 'Fastly Global CDN',
    location: 'Worldwide Pop (Edge Caching)',
    provider: 'Fastly Networks',
    country: 'Global',
    type: 'cdn',
    pingUrl: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
    downloadUrl: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js',
    uploadUrl: '/api/speedtest/upload',
  },
];

export async function fetchClientInfo(): Promise<ClientNetworkInfo> {
  const info: ClientNetworkInfo = {
    ip: 'Unknown',
    isp: 'Standard Broadband',
    country: 'Detecting...',
    city: '',
  };

  // 1. First fetch server-observed IP from backend
  try {
    const res = await fetch('/api/client-info', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      info.ip = data.ip;
      info.userAgent = data.userAgent;
      info.serverRegion = data.serverRegion;
    }
  } catch {
    // Continue with public APIs
  }

  // 2. Fetch ISP and Geo information from ipwho.is or Cloudflare meta
  try {
    const cfMeta = await fetch('https://speed.cloudflare.com/meta', {
      headers: { 'Accept': 'application/json' },
    });
    if (cfMeta.ok) {
      const cfData = await cfMeta.json();
      if (cfData.clientIp) info.ip = cfData.clientIp;
      if (cfData.asOrganization) info.isp = cfData.asOrganization;
      if (cfData.city) info.city = cfData.city;
      if (cfData.country) info.country = cfData.country;
      if (cfData.asn) info.asn = `AS${cfData.asn}`;
      return info;
    }
  } catch {
    // Fallback to ipapi.co
  }

  try {
    const res = await fetch('https://ipwho.is/', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        info.ip = data.ip || info.ip;
        info.isp = data.connection?.isp || data.connection?.org || 'Broadband ISP';
        info.city = data.city;
        info.country = data.country;
        info.countryCode = data.country_code;
        info.asn = data.connection?.asn ? `AS${data.connection.asn}` : undefined;
      }
    }
  } catch {
    // Keep fallback
  }

  // Network information API if available in browser
  const navConn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }).connection;
  if (navConn) {
    info.effectiveType = navConn.effectiveType;
    info.downlink = navConn.downlink;
    info.rtt = navConn.rtt;
  }

  return info;
}

export interface EngineCallbacks {
  onPhaseChange: (phase: 'ping' | 'download' | 'upload' | 'completed' | 'error') => void;
  onPingProgress: (currentPing: number, currentJitter: number, round: number, totalRounds: number) => void;
  onDownloadProgress: (instantMbps: number, smoothMbps: number, transferredBytes: number, progressPct: number) => void;
  onUploadProgress: (instantMbps: number, smoothMbps: number, transferredBytes: number, progressPct: number) => void;
  onLoadedPingProgress?: (loadedPing: number) => void;
  onTelemetryPoint?: (point: TelemetryPoint) => void;
}

export class SpeedTestEngine {
  private abortController: AbortController | null = null;
  private isRunning: boolean = false;

  public cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isRunning = false;
  }

  public getIsRunning() {
    return this.isRunning;
  }

  public async runTest(
    server: ServerTarget,
    durationSeconds: number = 10,
    concurrency: number = 4,
    callbacks: EngineCallbacks
  ): Promise<SpeedTestResult> {
    this.cancel();
    this.isRunning = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const testStartTime = performance.now();
    const telemetryHistory: TelemetryPoint[] = [];

    let pingMs = 0;
    let jitterMs = 0;
    let loadedPingMs = 0;
    let downloadMbps = 0;
    let uploadMbps = 0;
    let peakDownloadMbps = 0;
    let peakUploadMbps = 0;
    let totalDownloadBytes = 0;
    let totalUploadBytes = 0;

    try {
      // PHASE 1: PING & JITTER TEST
      callbacks.onPhaseChange('ping');
      soundManager.playPhaseShift();

      const pingResults = await this.measurePingAndJitter(server, 8, signal, (p, j, r, total) => {
        callbacks.onPingProgress(p, j, r, total);
        soundManager.playPing();
      });

      pingMs = pingResults.ping;
      jitterMs = pingResults.jitter;

      if (signal.aborted) throw new Error('Aborted');

      // PHASE 2: DOWNLOAD SPEED TEST
      callbacks.onPhaseChange('download');
      soundManager.playPhaseShift();

      const downloadTargetSeconds = Math.max(durationSeconds * 0.55, 4);
      const dlResult = await this.runDownloadPhase(
        server,
        downloadTargetSeconds,
        concurrency,
        signal,
        (instant, smooth, bytes, pct) => {
          callbacks.onDownloadProgress(instant, smooth, bytes, pct);
          const timeOffset = Math.round(performance.now() - testStartTime);
          const point: TelemetryPoint = {
            timeMs: timeOffset,
            phase: 'download',
            instantMbps: instant,
            smoothMbps: smooth,
            bytesTransferred: bytes,
          };
          telemetryHistory.push(point);
          callbacks.onTelemetryPoint?.(point);
        }
      );

      downloadMbps = dlResult.avgMbps;
      peakDownloadMbps = dlResult.peakMbps;
      totalDownloadBytes = dlResult.totalBytes;
      loadedPingMs = dlResult.loadedPing || Math.round(pingMs * 1.25);

      if (signal.aborted) throw new Error('Aborted');

      // PHASE 3: UPLOAD SPEED TEST
      callbacks.onPhaseChange('upload');
      soundManager.playPhaseShift();

      const uploadTargetSeconds = Math.max(durationSeconds * 0.45, 3.5);
      const ulResult = await this.runUploadPhase(
        server,
        uploadTargetSeconds,
        Math.min(concurrency, 4),
        signal,
        (instant, smooth, bytes, pct) => {
          callbacks.onUploadProgress(instant, smooth, bytes, pct);
          const timeOffset = Math.round(performance.now() - testStartTime);
          const point: TelemetryPoint = {
            timeMs: timeOffset,
            phase: 'upload',
            instantMbps: instant,
            smoothMbps: smooth,
            bytesTransferred: bytes,
          };
          telemetryHistory.push(point);
          callbacks.onTelemetryPoint?.(point);
        }
      );

      uploadMbps = ulResult.avgMbps;
      peakUploadMbps = ulResult.peakMbps;
      totalUploadBytes = ulResult.totalBytes;

      if (signal.aborted) throw new Error('Aborted');

      // FINALIZE RESULTS
      callbacks.onPhaseChange('completed');
      soundManager.playComplete();

      const clientInfo = await fetchClientInfo();
      const grade = computeGrade(downloadMbps, uploadMbps, pingMs, jitterMs);
      const bufferbloatGrade = computeBufferbloatGrade(pingMs, loadedPingMs);
      const suitability = computeSuitability(downloadMbps, uploadMbps, pingMs, jitterMs);

      const totalElapsedSeconds = parseFloat(((performance.now() - testStartTime) / 1000).toFixed(1));

      const finalResult: SpeedTestResult = {
        id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        server,
        pingMs: Math.round(pingMs),
        jitterMs: Math.round(jitterMs * 10) / 10,
        loadedPingMs: Math.round(loadedPingMs),
        downloadMbps: parseFloat(downloadMbps.toFixed(2)),
        uploadMbps: parseFloat(uploadMbps.toFixed(2)),
        peakDownloadMbps: parseFloat(peakDownloadMbps.toFixed(2)),
        peakUploadMbps: parseFloat(peakUploadMbps.toFixed(2)),
        totalDownloadBytes,
        totalUploadBytes,
        testDurationSeconds: totalElapsedSeconds,
        grade,
        bufferbloatGrade,
        clientInfo,
        suitability,
        telemetryHistory,
      };

      this.isRunning = false;
      return finalResult;
    } catch (err) {
      this.isRunning = false;
      if (!signal.aborted) {
        callbacks.onPhaseChange('error');
      }
      throw err;
    }
  }

  // Measure Ping and Jitter with sequential small HTTP requests
  private async measurePingAndJitter(
    server: ServerTarget,
    rounds: number = 8,
    signal: AbortSignal,
    onProgress: (curPing: number, curJitter: number, round: number, total: number) => void
  ): Promise<{ ping: number; jitter: number }> {
    const latencies: number[] = [];
    let jitter = 0;

    // Use ping URL with cache buster
    const getPingUrl = () => {
      const sep = server.pingUrl.includes('?') ? '&' : '?';
      return `${server.pingUrl}${sep}_t=${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    };

    for (let r = 1; r <= rounds; r++) {
      if (signal.aborted) throw new Error('Aborted');

      const start = performance.now();
      try {
        await fetch(getPingUrl(), {
          method: 'GET',
          cache: 'no-store',
          signal,
          mode: server.type === 'local' || server.pingUrl.startsWith('/') ? 'same-origin' : 'cors',
        });
        const elapsed = performance.now() - start;

        // Skip round 1 for average if > 1 to avoid initial TCP handshake/TLS setup bias
        latencies.push(elapsed);

        if (latencies.length > 1) {
          const prev = latencies[latencies.length - 2];
          const diff = Math.abs(elapsed - prev);
          jitter = jitter === 0 ? diff : jitter * 0.75 + diff * 0.25;
        }

        const validLatencies = latencies.length > 2 ? latencies.slice(1) : latencies;
        const avg = validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length;
        onProgress(Math.round(avg), parseFloat(jitter.toFixed(1)), r, rounds);

        // Small 60ms pause between pings
        await new Promise((resolve) => setTimeout(resolve, 60));
      } catch (e) {
        if (signal.aborted) throw e;
        // If external fails, fallback to local /api/ping
        if (server.pingUrl !== '/api/ping') {
          server.pingUrl = '/api/ping';
          r--;
        }
      }
    }

    const cleanLatencies = latencies.length > 2 ? latencies.slice(1) : latencies;
    cleanLatencies.sort((a, b) => a - b);
    // Take trimmed median
    const medianPing = cleanLatencies[Math.floor(cleanLatencies.length / 2)] || 18;

    return {
      ping: Math.max(medianPing, 1),
      jitter: Math.max(jitter, 0.4),
    };
  }

  // Concurrent Multi-Stream Download Phase
  private async runDownloadPhase(
    server: ServerTarget,
    targetDurationSec: number,
    streamsCount: number,
    signal: AbortSignal,
    onProgress: (instant: number, smooth: number, bytes: number, pct: number) => void
  ): Promise<{ avgMbps: number; peakMbps: number; totalBytes: number; loadedPing: number }> {
    const startTime = performance.now();
    const durationMs = targetDurationSec * 1000;
    let totalBytesLoaded = 0;
    let peakMbps = 0;
    let smoothMbps = 0;
    let lastBytesSample = 0;
    let lastTimeSample = startTime;
    const mbpsSamples: number[] = [];

    // Measure loaded ping during download
    let loadedPingSum = 0;
    let loadedPingCount = 0;

    // Trigger intermittent loaded ping in background during download
    const loadedPingInterval = setInterval(async () => {
      if (signal.aborted || performance.now() - startTime >= durationMs) return;
      try {
        const pingStart = performance.now();
        await fetch(`/api/ping?_lp=${Date.now()}`, { cache: 'no-store', signal });
        const delta = performance.now() - pingStart;
        loadedPingSum += delta;
        loadedPingCount++;
      } catch {}
    }, 900);

    // Adaptive chunk sizing: starts with 2MB, expands to 15MB or 25MB for high speeds
    let chunkSize = 5 * 1024 * 1024; // 5MB

    const streamWorker = async () => {
      while (!signal.aborted && performance.now() - startTime < durationMs) {
        try {
          const downloadUrl = server.type === 'cdn' && server.id === 'cloudflare-edge'
            ? `https://speed.cloudflare.com/__down?bytes=${chunkSize}&_t=${Date.now()}`
            : server.downloadUrl.includes('=')
            ? `${server.downloadUrl}${chunkSize}&_t=${Date.now()}`
            : `${server.downloadUrl}?_t=${Date.now()}`;

          const res = await fetch(downloadUrl, {
            cache: 'no-store',
            signal,
            mode: server.type === 'local' || downloadUrl.startsWith('/') ? 'same-origin' : 'cors',
          });

          if (!res.ok || !res.body) {
            // Fallback to local server if remote fails
            if (server.downloadUrl !== '/api/speedtest/download?bytes=') {
              server.downloadUrl = '/api/speedtest/download?bytes=';
            }
            const blob = await res.blob();
            totalBytesLoaded += blob.size;
            continue;
          }

          const reader = res.body.getReader();
          while (true) {
            if (signal.aborted || performance.now() - startTime >= durationMs) {
              await reader.cancel();
              break;
            }
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              totalBytesLoaded += value.length;
            }
          }
        } catch (e) {
          if (signal.aborted) break;
          // Fallback to local
          server.downloadUrl = '/api/speedtest/download?bytes=';
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    };

    // UI Progress loop running every 100ms
    const progressPromise = new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        const now = performance.now();
        const elapsed = now - startTime;
        const deltaMs = now - lastTimeSample;

        if (deltaMs >= 80) {
          const deltaBytes = totalBytesLoaded - lastBytesSample;
          // (bytes * 8) / (seconds * 1,000,000) = Mbps
          const instantMbps = (deltaBytes * 8) / (deltaMs * 1000);

          if (instantMbps > 0) {
            // Smooth Exponential Moving Average
            if (smoothMbps === 0) {
              smoothMbps = instantMbps;
            } else {
              smoothMbps = smoothMbps * 0.7 + instantMbps * 0.3;
            }

            if (instantMbps > peakMbps && elapsed > 800) {
              peakMbps = instantMbps;
            }

            // Adapt chunk size for faster connections
            if (smoothMbps > 100 && chunkSize < 20 * 1024 * 1024) {
              chunkSize = 20 * 1024 * 1024;
            } else if (smoothMbps > 40 && chunkSize < 10 * 1024 * 1024) {
              chunkSize = 10 * 1024 * 1024;
            }

            // Collect samples after initial slow-start (first 600ms)
            if (elapsed > 600) {
              mbpsSamples.push(instantMbps);
            }
          }

          lastBytesSample = totalBytesLoaded;
          lastTimeSample = now;
        }

        const pct = Math.min((elapsed / durationMs) * 100, 100);
        onProgress(
          parseFloat(smoothMbps.toFixed(2)),
          parseFloat(smoothMbps.toFixed(2)),
          totalBytesLoaded,
          pct
        );

        if (elapsed >= durationMs || signal.aborted) {
          clearInterval(interval);
          clearInterval(loadedPingInterval);
          resolve();
        }
      }, 100);
    });

    // Launch parallel streams
    const workers = Array.from({ length: streamsCount }, () => streamWorker());
    await Promise.race([Promise.all(workers), progressPromise]);
    clearInterval(loadedPingInterval);

    // Calculate final weighted 80th percentile / median to avoid slow-start anomaly
    let finalAvg = smoothMbps;
    if (mbpsSamples.length > 4) {
      // Sort and discard bottom 15% and top 10% outliers
      mbpsSamples.sort((a, b) => a - b);
      const startIdx = Math.floor(mbpsSamples.length * 0.15);
      const endIdx = Math.floor(mbpsSamples.length * 0.90);
      const trimmed = mbpsSamples.slice(startIdx, endIdx);
      if (trimmed.length > 0) {
        finalAvg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
      }
    }

    const loadedPing = loadedPingCount > 0 ? Math.round(loadedPingSum / loadedPingCount) : 0;

    return {
      avgMbps: Math.max(finalAvg, 0.5),
      peakMbps: Math.max(peakMbps, finalAvg),
      totalBytes: totalBytesLoaded,
      loadedPing,
    };
  }

  // Multi-Connection Upload Phase
  private async runUploadPhase(
    server: ServerTarget,
    targetDurationSec: number,
    streamsCount: number,
    signal: AbortSignal,
    onProgress: (instant: number, smooth: number, bytes: number, pct: number) => void
  ): Promise<{ avgMbps: number; peakMbps: number; totalBytes: number }> {
    const startTime = performance.now();
    const durationMs = targetDurationSec * 1000;
    let totalBytesUploaded = 0;
    let peakMbps = 0;
    let smoothMbps = 0;
    let lastBytesSample = 0;
    let lastTimeSample = startTime;
    const mbpsSamples: number[] = [];

    // Pre-create binary blob chunks for uploading (e.g. 1MB & 2MB)
    const payloadSize = 1.5 * 1024 * 1024; // 1.5MB
    const uploadPayload = new Blob([new Uint8Array(payloadSize)]);

    const uploadWorker = async () => {
      while (!signal.aborted && performance.now() - startTime < durationMs) {
        try {
          const uploadUrl = server.type === 'cdn' && server.id === 'cloudflare-edge'
            ? 'https://speed.cloudflare.com/__up'
            : '/api/speedtest/upload';

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl, true);

            let lastLoaded = 0;
            xhr.upload.onprogress = (e) => {
              if (signal.aborted) {
                xhr.abort();
                reject(new Error('Aborted'));
                return;
              }
              const delta = e.loaded - lastLoaded;
              if (delta > 0) {
                totalBytesUploaded += delta;
                lastLoaded = e.loaded;
              }
            };

            xhr.onload = () => resolve();
            xhr.onerror = () => {
              // If Cloudflare fails or blocks CORS, switch to local server
              server.uploadUrl = '/api/speedtest/upload';
              resolve();
            };
            xhr.onabort = () => resolve();

            if (signal.aborted) {
              xhr.abort();
              resolve();
            } else {
              xhr.send(uploadPayload);
            }
          });
        } catch {
          if (signal.aborted) break;
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    };

    const progressPromise = new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        const now = performance.now();
        const elapsed = now - startTime;
        const deltaMs = now - lastTimeSample;

        if (deltaMs >= 80) {
          const deltaBytes = totalBytesUploaded - lastBytesSample;
          const instantMbps = (deltaBytes * 8) / (deltaMs * 1000);

          if (instantMbps > 0) {
            if (smoothMbps === 0) {
              smoothMbps = instantMbps;
            } else {
              smoothMbps = smoothMbps * 0.7 + instantMbps * 0.3;
            }

            if (instantMbps > peakMbps && elapsed > 600) {
              peakMbps = instantMbps;
            }

            if (elapsed > 500) {
              mbpsSamples.push(instantMbps);
            }
          }

          lastBytesSample = totalBytesUploaded;
          lastTimeSample = now;
        }

        const pct = Math.min((elapsed / durationMs) * 100, 100);
        onProgress(
          parseFloat(smoothMbps.toFixed(2)),
          parseFloat(smoothMbps.toFixed(2)),
          totalBytesUploaded,
          pct
        );

        if (elapsed >= durationMs || signal.aborted) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });

    const workers = Array.from({ length: streamsCount }, () => uploadWorker());
    await Promise.race([Promise.all(workers), progressPromise]);

    let finalAvg = smoothMbps;
    if (mbpsSamples.length > 4) {
      mbpsSamples.sort((a, b) => a - b);
      const startIdx = Math.floor(mbpsSamples.length * 0.15);
      const endIdx = Math.floor(mbpsSamples.length * 0.90);
      const trimmed = mbpsSamples.slice(startIdx, endIdx);
      if (trimmed.length > 0) {
        finalAvg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
      }
    }

    return {
      avgMbps: Math.max(finalAvg, 0.4),
      peakMbps: Math.max(peakMbps, finalAvg),
      totalBytes: totalBytesUploaded,
    };
  }
}

// Compute connection grade based on bandwidth, latency, and jitter
export function computeGrade(
  downloadMbps: number,
  uploadMbps: number,
  pingMs: number,
  jitterMs: number
): ConnectionGrade {
  if (downloadMbps >= 250 && uploadMbps >= 40 && pingMs <= 25 && jitterMs <= 4) {
    return 'A+';
  }
  if (downloadMbps >= 100 && uploadMbps >= 20 && pingMs <= 40 && jitterMs <= 8) {
    return 'A';
  }
  if (downloadMbps >= 45 && uploadMbps >= 10 && pingMs <= 70 && jitterMs <= 15) {
    return 'B';
  }
  if (downloadMbps >= 15 && uploadMbps >= 3 && pingMs <= 110) {
    return 'C';
  }
  if (downloadMbps >= 5) {
    return 'D';
  }
  return 'F';
}

export function computeBufferbloatGrade(ping: number, loadedPing: number): 'A+' | 'A' | 'B' | 'C' | 'D' {
  if (!loadedPing || loadedPing <= ping) return 'A+';
  const delta = loadedPing - ping;
  if (delta <= 12) return 'A+';
  if (delta <= 30) return 'A';
  if (delta <= 65) return 'B';
  if (delta <= 130) return 'C';
  return 'D';
}

export function computeSuitability(
  dl: number,
  ul: number,
  ping: number,
  jitter: number
): ActivitySuitability {
  // Gaming: demands low ping & jitter
  let gamingStatus: 'Optimal' | 'Good' | 'Fair' | 'Poor' = 'Poor';
  let gamingDetail = 'High latency will cause game lag or desync';
  if (ping <= 20 && jitter <= 3) {
    gamingStatus = 'Optimal';
    gamingDetail = 'Tournament-grade response time; 0 perceptible lag';
  } else if (ping <= 45 && jitter <= 7) {
    gamingStatus = 'Good';
    gamingDetail = 'Smooth multiplayer gaming without hitches';
  } else if (ping <= 85) {
    gamingStatus = 'Fair';
    gamingDetail = 'Playable for casual games; slight delay in FPS titles';
  }

  // 4K / 8K Streaming: demands download bandwidth
  let streamStatus: '4K/8K HDR' | '1080p Full HD' | '720p HD' | 'SD Only' = 'SD Only';
  let streamDetail = 'Buffering likely on high-def streams';
  if (dl >= 80) {
    streamStatus = '4K/8K HDR';
    streamDetail = 'Multiple simultaneous 4K streams with Dolby Atmos';
  } else if (dl >= 25) {
    streamStatus = '4K/8K HDR';
    streamDetail = 'Smooth single 4K HDR stream without buffering';
  } else if (dl >= 10) {
    streamStatus = '1080p Full HD';
    streamDetail = 'Flawless 1080p 60fps streaming';
  } else if (dl >= 4) {
    streamStatus = '720p HD';
    streamDetail = 'Standard high definition supported';
  }

  // Video calls: demands upload & low jitter
  let confStatus: 'Crystal Clear' | 'Good HD' | 'Acceptable' | 'Choppy' = 'Choppy';
  let confDetail = 'Upload speed or jitter may degrade call quality';
  if (ul >= 10 && ping <= 45 && jitter <= 6) {
    confStatus = 'Crystal Clear';
    confDetail = 'Studio 1080p video conferences & screen sharing';
  } else if (ul >= 4 && ping <= 75) {
    confStatus = 'Good HD';
    confDetail = 'Stable HD group meetings on Zoom/Teams';
  } else if (ul >= 1.5) {
    confStatus = 'Acceptable';
    confDetail = 'Standard quality 1-on-1 calls';
  }

  // Large file transfers
  let dlStatus: 'Lightning Fast' | 'Fast' | 'Average' | 'Slow' = 'Slow';
  let dlDetail = 'Files over 1GB will take several minutes';
  if (dl >= 300) {
    dlStatus = 'Lightning Fast';
    dlDetail = '10GB file downloads in under 3 minutes';
  } else if (dl >= 100) {
    dlStatus = 'Fast';
    dlDetail = '5GB file downloads in approx. 7 minutes';
  } else if (dl >= 30) {
    dlStatus = 'Average';
    dlDetail = 'Standard broadband transfer rates';
  }

  return {
    gaming: { status: gamingStatus, detail: gamingDetail },
    streaming: { status: streamStatus, detail: streamDetail },
    conferencing: { status: confStatus, detail: confDetail },
    downloads: { status: dlStatus, detail: dlDetail },
  };
}

// Format bytes into readable format
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
