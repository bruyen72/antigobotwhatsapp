// API para verificar status das sessões WhatsApp
import { getAllSessions, getSession } from '../lib/session-manager.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { sessionId } = req.query;

    if (sessionId) {
      // Buscar sessão específica
      const session = getSession(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Sessão não encontrada',
          sessionId: sessionId
        });
      }

      return res.status(200).json({
        success: true,
        session: {
          id: sessionId,
          connected: session.connected,
          phoneNumber: session.phoneNumber,
          pairingCode: session.pairingCode,
          lastActivity: new Date(session.lastActivity).toISOString(),
          isActive: (Date.now() - session.lastActivity) < 30 * 60 * 1000
        }
      });
    } else {
      // Listar todas as sessões
      const sessions = getAllSessions();

      return res.status(200).json({
        success: true,
        totalSessions: sessions.length,
        sessions: sessions.map(session => ({
          ...session,
          lastActivity: new Date(session.lastActivity).toISOString(),
          isActive: (Date.now() - session.lastActivity) < 30 * 60 * 1000
        }))
      });
    }

  } catch (error) {
    console.error('Erro na API de sessões:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}