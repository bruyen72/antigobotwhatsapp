import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import API handlers
import statusHandler from './api/status.js';
import testHandler from './api/test.js';
import qrHandler from './api/qr.js';
import pairHandler from './api/pair.js';
import sessionsHandler from './api/sessions.js';
import monitorHandler from './api/monitor.js';
import statusSessionHandler from './api/status-session.js';
import testConnectionHandler from './api/test-connection.js';

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
app.get('/api/sessions', sessionsHandler);
app.get('/api/monitor', monitorHandler);
app.get('/api/status-session', statusSessionHandler);
app.get('/api/test-connection', testConnectionHandler);

// Health check for Render - incluindo status das sessões WhatsApp
app.get('/health', async (req, res) => {
  try {
    const { getAllSessions } = await import('./lib/session-manager.js');
    const sessions = getAllSessions();
    const activeSessions = sessions.filter(s => s.connected).length;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Knight Bot WhatsApp',
      whatsapp: {
        totalSessions: sessions.length,
        activeSessions: activeSessions,
        healthy: true
      },
      render: {
        container: 'running',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(200).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      service: 'Knight Bot WhatsApp',
      error: error.message
    });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Start server com configurações para Render
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Knight Bot server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Configurações para evitar timeout no Render
server.keepAliveTimeout = 120000; // 2 minutos
server.headersTimeout = 120000; // 2 minutos

// Evitar que o processo morra no Render
process.on('SIGTERM', () => {
  console.log('💾 SIGTERM recebido, mantendo conexões WhatsApp...');
  setTimeout(() => {
    console.log('🔄 Finalizando graciosamente...');
    process.exit(0);
  }, 30000); // 30 segundos para finalizar conexões
});

process.on('SIGINT', () => {
  console.log('💾 SIGINT recebido, mantendo conexões WhatsApp...');
  setTimeout(() => {
    console.log('🔄 Finalizando graciosamente...');
    process.exit(0);
  }, 30000);
});