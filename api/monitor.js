// API para monitorar conexões WhatsApp em tempo real
import { getAllSessions, getSession } from '../lib/session-manager.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sessions = getAllSessions();
    const now = Date.now();

    const sessionStats = sessions.map(session => {
      const ageMinutes = Math.floor((now - session.lastActivity) / (1000 * 60));
      const createdMinutes = Math.floor((now - (session.createdAt || session.lastActivity)) / (1000 * 60));

      return {
        id: session.id,
        phoneNumber: session.phoneNumber,
        pairingCode: session.pairingCode,
        connected: session.connected,
        ageMinutes: ageMinutes,
        createdMinutes: createdMinutes,
        status: session.connected ? '🟢 Conectado' :
                ageMinutes < 10 ? '🟡 Aguardando' : '🔴 Expirado',
        lastActivity: new Date(session.lastActivity).toISOString()
      };
    });

    const activeCount = sessions.filter(s => s.connected).length;
    const waitingCount = sessions.filter(s => !s.connected && (now - s.lastActivity) < 10 * 60 * 1000).length;
    const expiredCount = sessions.length - activeCount - waitingCount;

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: sessions.length,
        active: activeCount,
        waiting: waitingCount,
        expired: expiredCount
      },
      sessions: sessionStats,
      instructions: {
        monitor: 'Acesse /api/monitor para ver status das sessões',
        test: 'Use /api/pair?number=SEU_NUMERO para gerar código',
        status: 'Códigos ficam ativos por 10 minutos para conexão'
      }
    });

  } catch (error) {
    console.error('Erro na API de monitoramento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}