import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { generateAddresses, isValidVersion, isValidCount, isValidRange, allowedRanges } from './generator.js';
import { handleMcpRequest } from './mcp.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Vercel runs behind a proxy; trust it for correct client IPs / rate limiting
app.set('trust proxy', 1);

// Simple in-memory rate limiter: 30 requests per minute per IP
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 1000;
const rateBuckets = new Map();

function rateLimiter(req, res, next) {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start >= RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((bucket.start + RATE_WINDOW_MS - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    res.set('Cache-Control', 'no-store');
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait 1 minute for the rate limit to reset.',
    });
  }
  next();
}

// Periodic cleanup to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.start >= RATE_WINDOW_MS) rateBuckets.delete(key);
  }
}, RATE_WINDOW_MS).unref();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Static assets (used for local development; Vercel serves public/ directly)
app.use(express.static(path.join(__dirname, 'public')));

// Home
app.get('/', (_req, res) => {
  res.render('index', { title: 'RandomIPGen' });
});

app.get('/about', (_req, res) => {
  res.render('about', { title: 'About - RandomIPGen' });
});

// Rate limit API generation endpoint
app.use('/api/generate', rateLimiter);

// API method guard
app.all('/api/generate', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).set('Allow', 'POST').json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
    return;
  }
  next();
});

app.post('/api/generate', (req, res) => {
  res.set('Cache-Control', 'no-store');

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { version, count } = body;
  const range = body.range === undefined ? 'any' : body.range;

  if (!isValidVersion(version)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid "version". Accepted values: "ipv4", "ipv6".',
    });
  }

  if (!isValidRange(version, range)) {
    return res.status(400).json({
      success: false,
      error: `Invalid "range". Accepted values: ${allowedRanges(version).join(', ')}.`,
    });
  }

  if (!isValidCount(count)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid "count". Must be an integer between 1 and 100.',
    });
  }

  try {
    const addresses = generateAddresses(version, count, range);
    return res.status(200).json({
      success: true,
      version,
      range,
      count: addresses.length,
      addresses,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to generate addresses. Please try again.',
    });
  }
});

// MCP Streamable HTTP endpoint
app.post('/mcp', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const body = req.body;
  const handleOne = (r) => handleMcpRequest(r);

  if (Array.isArray(body)) {
    const results = body.map(handleOne).filter((r) => r !== null);
    return res.status(200).json(results);
  }

  const result = handleOne(body);
  if (result === null) {
    return res.status(202).end();
  }
  return res.status(200).json(result);
});

app.get('/mcp', (_req, res) => {
  res.status(405).set('Allow', 'POST, DELETE').json({ error: 'Method not allowed. Use POST.' });
});

app.delete('/mcp', (_req, res) => {
  res.status(204).end();
});

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).set('Cache-Control', 'no-store').json({
      success: false,
      error: 'Endpoint not found.',
    });
    return;
  }
  res.status(404).send('Not found');
});

// Error handler (malformed JSON, etc.)
app.use((err, req, res, _next) => {
  res.set('Cache-Control', 'no-store');
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON in request body.',
    });
  }
  return res.status(500).json({
    success: false,
    error: 'Internal server error.',
  });
});

// Local startup only
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`RandomIPGen running at http://localhost:${port}`);
  });
}

export default app;