import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import API handlers
import statusHandler from './api/status.js';
import testHandler from './api/test.js';
import qrHandler from './api/qr.js';
import pairHandler from './api/pair.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// API Routes
app.get('/api/status', statusHandler);
app.get('/api/test', testHandler);
app.get('/api/qr', qrHandler);
app.get('/api/pair', pairHandler);

// Health check for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Knight Bot WhatsApp'
  });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Knight Bot server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});