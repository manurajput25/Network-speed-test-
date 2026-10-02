import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  // Enable CORS headers for speed test endpoints
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Cache-Control');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Pre-generate a 1MB random binary chunk to quickly stream without heavy CPU usage
  const CHUNK_SIZE = 1024 * 1024; // 1 MB
  const randomChunk = crypto.randomBytes(CHUNK_SIZE);

  // 1. High-precision Ping endpoint
  app.get('/api/ping', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.json({
      status: 'ok',
      serverTime: Date.now(),
      region: process.env.K_SERVICE ? 'Google Cloud Run (asia-southeast1)' : 'Local Dev Server'
    });
  });

  // 2. Download speed test stream
  app.get('/api/speedtest/download', (req: Request, res: Response) => {
    // Default 15MB, allow up to 100MB
    const totalBytes = Math.min(
      Math.max(parseInt(req.query.bytes as string || `${15 * 1024 * 1024}`, 10) || 15 * 1024 * 1024, 1024),
      100 * 1024 * 1024
    );

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', totalBytes.toString());
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');

    let bytesSent = 0;

    function sendNext() {
      while (bytesSent < totalBytes) {
        const remaining = totalBytes - bytesSent;
        const currentChunkSize = Math.min(remaining, CHUNK_SIZE);
        const buffer = currentChunkSize === CHUNK_SIZE ? randomChunk : randomChunk.subarray(0, currentChunkSize);
        bytesSent += currentChunkSize;

        const canContinue = res.write(buffer);
        if (!canContinue) {
          res.once('drain', sendNext);
          return;
        }
      }
      res.end();
    }

    req.on('close', () => {
      // Client aborted connection
      res.end();
    });

    sendNext();
  });

  // 3. Upload speed test endpoint
  app.post('/api/speedtest/upload', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    let totalBytesReceived = 0;
    const startTime = Date.now();

    req.on('data', (chunk: Buffer) => {
      totalBytesReceived += chunk.length;
    });

    req.on('end', () => {
      const elapsedMs = Math.max(Date.now() - startTime, 1);
      const mbps = (totalBytesReceived * 8) / (elapsedMs * 1000);
      res.json({
        bytesReceived: totalBytesReceived,
        elapsedMs,
        speedMbps: parseFloat(mbps.toFixed(2))
      });
    });

    req.on('error', () => {
      res.status(500).json({ error: 'Stream error' });
    });
  });

  // 4. Client info endpoint
  app.get('/api/client-info', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' 
      ? forwarded.split(',')[0].trim() 
      : req.socket.remoteAddress || '127.0.0.1';

    res.json({
      ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      serverRegion: process.env.K_SERVICE ? 'Google Cloud Run (asia-southeast1)' : 'Local Host Node',
      timestamp: Date.now()
    });
  });

  // Mount Vite or static server
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
