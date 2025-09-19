// API para verificar status específico de uma sessão
import { getSession } from '../lib/session-manager.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'sessionId é obrigatório',
      example: '/api/status-session?sessionId=pair-session-123456'
    });
  }

  try {
    const session = getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada',
        sessionId: sessionId,
        note: 'A sessão pode ter expirado ou sido removida'
      });
    }

    const now = Date.now();
    const ageMinutes = Math.floor((now - session.lastActivity) / (1000 * 60));
    const createdMinutes = Math.floor((now - (session.createdAt || session.lastActivity)) / (1000 * 60));

    const status = session.connected ? '🟢 Conectado e Pareado' :
                  session.pairingCode && session.status === 'waiting_for_pairing' ? '🟡 Aguardando Pareamento' :
                  session.pairingCode ? '🔄 Código Gerado' :
                  ageMinutes < 10 ? '🟡 Conectando' : '🔴 Expirado';

    const response = {
      success: true,
      session: {
        id: sessionId,
        phoneNumber: session.phoneNumber,
        pairingCode: session.pairingCode,
        connected: session.connected,
        status: session.status,
        displayStatus: status,
        ageMinutes: ageMinutes,
        createdMinutes: createdMinutes,
        lastActivity: new Date(session.lastActivity).toISOString()
      },
      instructions: session.pairingCode ? [
        `1. Código: ${session.pairingCode}`,
        '2. Abra WhatsApp no celular',
        '3. Vá em Configurações → Aparelhos conectados',
        '4. Toque em "Conectar um aparelho"',
        '5. Escolha "Vincular com número"',
        '6. Digite o código acima'
      ] : [
        'Sessão ainda não gerou código de pareamento'
      ],
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Erro ao verificar status da sessão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno',
      message: error.message
    });
  }
}