// API de Status do Bot
export default function handler(req, res) {
  const status = {
    bot: {
      name: 'Knight Bot',
      version: '1.0.0',
      status: 'online',
      platform: 'Vercel Serverless',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    },
    whatsapp: {
      connected: false,
      status: 'Aguardando configuração',
      lastConnection: null
    },
    features: {
      pairing: 'Disponível (Mock)',
      qrCode: 'Em desenvolvimento',
      commands: 'Não implementado',
      groups: 'Não implementado'
    },
    endpoints: [
      '/api/status',
      '/api/test',
      '/api/pair (em breve)',
      '/api/qr (em breve)'
    ],
    timestamp: new Date().toISOString()
  };

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(status);
}