export type TestPhase = 'idle' | 'ping' | 'download' | 'upload' | 'completed' | 'error';

export interface ServerTarget {
  id: string;
  name: string;
  location: string;
  provider: string;
  country: string;
  type: 'cdn' | 'cloud' | 'local';
  pingUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  isCustom?: boolean;
}

export interface ClientNetworkInfo {
  ip: string;
  isp?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  asn?: string;
  userAgent?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  serverRegion?: string;
}

export interface TelemetryPoint {
  timeMs: number;
  phase: 'download' | 'upload';
  instantMbps: number;
  smoothMbps: number;
  bytesTransferred: number;
}

export type ConnectionGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface ActivitySuitability {
  gaming: { status: 'Optimal' | 'Good' | 'Fair' | 'Poor'; detail: string };
  streaming: { status: '4K/8K HDR' | '1080p Full HD' | '720p HD' | 'SD Only'; detail: string };
  conferencing: { status: 'Crystal Clear' | 'Good HD' | 'Acceptable' | 'Choppy'; detail: string };
  downloads: { status: 'Lightning Fast' | 'Fast' | 'Average' | 'Slow'; detail: string };
}

export interface SpeedTestResult {
  id: string;
  timestamp: number;
  server: ServerTarget;
  pingMs: number;
  jitterMs: number;
  loadedPingMs: number;
  downloadMbps: number;
  uploadMbps: number;
  peakDownloadMbps: number;
  peakUploadMbps: number;
  totalDownloadBytes: number;
  totalUploadBytes: number;
  testDurationSeconds: number;
  grade: ConnectionGrade;
  bufferbloatGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  clientInfo?: ClientNetworkInfo;
  suitability: ActivitySuitability;
  telemetryHistory: TelemetryPoint[];
}

export interface SpeedTestConfig {
  server: ServerTarget;
  durationSeconds: number; // 5, 10, 20
  concurrency: number; // 1, 4, 8
  soundEnabled: boolean;
  unit: 'Mbps' | 'MB/s' | 'Gbps';
}
