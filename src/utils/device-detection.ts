export interface DeviceTelemetryInfo {
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'tablet' | 'mobile' | 'console' | 'unknown';
  osName: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
  cpuCores?: number;
  deviceMemoryGb?: number;
  screenResolution: string;
  gpuRenderer?: string;
  platform: string;
  isMobile: boolean;
  isTouch: boolean;
}

/**
 * Synchronous initial detection that runs in 0ms without waiting for promises
 */
export function detectDeviceTelemetrySync(): DeviceTelemetryInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0));

  // 1. Detect OS & OS Version
  let osName = 'Unknown OS';
  let osVersion = '';

  if (/Windows NT 10.0/i.test(ua)) {
    osName = 'Windows 11 / 10';
  } else if (/Windows NT 6.3/i.test(ua)) {
    osName = 'Windows 8.1';
  } else if (/Windows NT 6.1/i.test(ua)) {
    osName = 'Windows 7';
  } else if (/iPhone/i.test(ua)) {
    osName = 'iOS';
    const match = ua.match(/OS (\d+[_\.]\d+)/i);
    if (match) osVersion = match[1].replace('_', '.');
  } else if (/iPad/i.test(ua)) {
    osName = 'iPadOS';
    const match = ua.match(/OS (\d+[_\.]\d+)/i);
    if (match) osVersion = match[1].replace('_', '.');
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    if (isTouch && navigator.maxTouchPoints > 1) {
      osName = 'iPadOS';
    } else {
      osName = 'macOS';
      const match = ua.match(/Mac OS X (\d+[_\.]\d+[_\.]?\d*)/i);
      if (match) osVersion = match[1].replace(/_/g, '.');
    }
  } else if (/Android/i.test(ua)) {
    osName = 'Android';
    const match = ua.match(/Android\s+([0-9\.]+)/i);
    if (match) osVersion = match ? match[1] : '';
  } else if (/CrOS/i.test(ua)) {
    osName = 'ChromeOS';
  } else if (/Linux/i.test(ua)) {
    osName = 'Linux';
  }

  // 2. Detect Browser
  let browserName = 'Browser';
  let browserVersion = '';

  if (/Edg\/([0-9\.]+)/i.test(ua)) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/([0-9\.]+)/i)?.[1] || '';
  } else if (/OPR\/([0-9\.]+)/i.test(ua) || /Opera/i.test(ua)) {
    browserName = 'Opera';
    browserVersion = ua.match(/OPR\/([0-9\.]+)/i)?.[1] || '';
  } else if (/Chrome\/([0-9\.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/([0-9\.]+)/i)?.[1] || '';
  } else if (/Firefox\/([0-9\.]+)/i.test(ua)) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/([0-9\.]+)/i)?.[1] || '';
  } else if (/Safari\/([0-9\.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/([0-9\.]+)/i)?.[1] || '';
  }

  const shortBrowserVer = browserVersion.split('.')[0] ? `v${browserVersion.split('.')[0]}` : '';

  // 3. Detect Form Factor & Device Model Name
  let deviceType: 'desktop' | 'laptop' | 'tablet' | 'mobile' | 'console' | 'unknown' = 'desktop';
  let deviceName = '';

  const isIPhone = /iPhone/i.test(ua);
  const isIPad = /iPad/i.test(ua) || (osName === 'iPadOS');
  const isAndroidMobile = /Android/i.test(ua) && /Mobile/i.test(ua);
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);

  if (isIPhone) {
    deviceType = 'mobile';
    deviceName = osVersion ? `Apple iPhone (iOS ${osVersion})` : 'Apple iPhone';
  } else if (isIPad) {
    deviceType = 'tablet';
    deviceName = osVersion ? `Apple iPad (iPadOS ${osVersion})` : 'Apple iPad';
  } else if (isAndroidTablet) {
    deviceType = 'tablet';
    const model = extractAndroidModel(ua);
    deviceName = model ? `${model} (Tablet)` : `Android Tablet`;
  } else if (isAndroidMobile) {
    deviceType = 'mobile';
    const model = extractAndroidModel(ua);
    deviceName = model || `Android Smartphone`;
  } else if (osName === 'macOS') {
    const isLikelyLaptop = typeof window !== 'undefined' && window.screen.width <= 1728 && window.screen.height <= 1117;
    deviceType = isLikelyLaptop ? 'laptop' : 'desktop';
    deviceName = isLikelyLaptop ? 'MacBook Pro / Air' : 'Apple Mac';
  } else if (osName.startsWith('Windows')) {
    deviceType = 'desktop';
    deviceName = 'Windows PC';
  } else if (osName === 'ChromeOS') {
    deviceType = 'laptop';
    deviceName = 'Chromebook';
  } else if (osName === 'Linux') {
    deviceType = 'desktop';
    deviceName = 'Linux Workstation';
  } else {
    deviceName = `${browserName} Device`;
  }

  // 4. Hardware specs
  const cpuCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || undefined : undefined;
  const deviceMemoryGb = typeof navigator !== 'undefined' ? (navigator as unknown as { deviceMemory?: number }).deviceMemory || undefined : undefined;
  const screenResolution = typeof window !== 'undefined' 
    ? `${window.screen.width} × ${window.screen.height} (${window.devicePixelRatio || 1}x)` 
    : 'Standard Display';

  // 5. GPU WebGL detection
  let gpuRenderer: string | undefined = undefined;
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && gl instanceof WebGLRenderingContext) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          const unmasked = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
          if (typeof unmasked === 'string') {
            gpuRenderer = unmasked
              .replace(/ANGLE \((.*)\)/, '$1')
              .replace(/Direct3D.*vs_\d+_\d+ ps_\d+_\d+/, '')
              .replace(/Google SwiftShader/, 'Integrated Software')
              .trim();
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return {
    deviceName,
    deviceType,
    osName,
    osVersion,
    browserName,
    browserVersion: shortBrowserVer,
    cpuCores,
    deviceMemoryGb,
    screenResolution,
    gpuRenderer,
    platform,
    isMobile: deviceType === 'mobile' || deviceType === 'tablet',
    isTouch: !!isTouch,
  };
}

/**
 * Async detection with high-entropy Client Hints for Chromium (Model name e.g. Pixel 8, Galaxy S24)
 */
export async function detectDeviceTelemetry(): Promise<DeviceTelemetryInfo> {
  const syncInfo = detectDeviceTelemetrySync();

  const navData = (typeof navigator !== 'undefined'
    ? (navigator as unknown as {
        userAgentData?: {
          brands?: { brand: string; version: string }[];
          mobile?: boolean;
          platform?: string;
          getHighEntropyValues?: (hints: string[]) => Promise<{
            model?: string;
            platformVersion?: string;
            architecture?: string;
          }>;
        };
      }).userAgentData
    : undefined);

  if (navData && navData.getHighEntropyValues) {
    try {
      const hintsPromise = navData.getHighEntropyValues(['model', 'platformVersion', 'architecture']);
      const timeoutPromise = new Promise<{ model?: string; platformVersion?: string; architecture?: string }>((resolve) =>
        setTimeout(() => resolve({}), 200)
      );
      const hints = await Promise.race([hintsPromise, timeoutPromise]);

      if (hints.model) {
        let model = hints.model;
        if (/SM-[A-Z0-9]+/i.test(model)) model = `Samsung Galaxy (${model})`;
        if (/Pixel/i.test(model)) model = `Google ${model}`;
        syncInfo.deviceName = model;
      }

      if (hints.platformVersion && syncInfo.osName.includes('Windows')) {
        const major = parseInt(hints.platformVersion.split('.')[0] || '0', 10);
        if (major >= 13) {
          syncInfo.osName = 'Windows 11';
          if (!syncInfo.deviceName.includes('Samsung') && !syncInfo.deviceName.includes('Pixel')) {
            syncInfo.deviceName = 'Windows 11 PC';
          }
        } else {
          syncInfo.osName = 'Windows 10';
          if (!syncInfo.deviceName.includes('Samsung') && !syncInfo.deviceName.includes('Pixel')) {
            syncInfo.deviceName = 'Windows 10 PC';
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return syncInfo;
}

function extractAndroidModel(ua: string): string {
  // Typical Android UA: (Linux; Android 14; Pixel 8 Pro Build/...)
  const match = ua.match(/;\s+([^;\)]+?)\s+Build\//i);
  if (match && match[1]) {
    const raw = match[1].trim();
    if (/SM-[A-Z0-9]+/i.test(raw)) return `Samsung Galaxy (${raw})`;
    if (/Pixel/i.test(raw)) return `Google ${raw}`;
    if (/OnePlus/i.test(raw)) return `OnePlus (${raw})`;
    if (/Xiaomi|Redmi|POCO/i.test(raw)) return `Xiaomi (${raw})`;
    if (/Vivo/i.test(raw)) return `Vivo (${raw})`;
    if (/Oppo/i.test(raw)) return `Oppo (${raw})`;
    if (/Moto/i.test(raw)) return `Motorola (${raw})`;
    return raw;
  }
  return '';
}
