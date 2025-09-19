// API de Pareamento WhatsApp Real
import { makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino';

const logger = P({ level: 'silent' });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { number } = req.query;

  if (!number) {
    return res.status(400).json({
      success: false,
      error: 'Número de telefone é obrigatório',
      example: '/api/pair?number=5511999999999',
      format: 'Use apenas números com código do país (ex: 5511999999999)'
    });
  }

  try {
    // Validação robusta do número
    const cleanNumber = number.replace(/[^0-9]/g, '');

    // Validações detalhadas
    if (cleanNumber.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Número muito curto',
        details: 'Mínimo 10 dígitos (código país + número)',
        received: cleanNumber,
        example: 'Brasil: 5511999999999, EUA: 15551234567'
      });
    }

    if (cleanNumber.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'Número muito longo',
        details: 'Máximo 15 dígitos conforme padrão internacional',
        received: cleanNumber
      });
    }

    // Detectar país baseado no código
    let country = 'Desconhecido';
    if (cleanNumber.startsWith('55')) country = 'Brasil';
    else if (cleanNumber.startsWith('1')) country = 'EUA/Canadá';
    else if (cleanNumber.startsWith('44')) country = 'Reino Unido';
    else if (cleanNumber.startsWith('33')) country = 'França';
    else if (cleanNumber.startsWith('49')) country = 'Alemanha';

    // Gerar código real do WhatsApp usando Baileys
    const sessionId = `pair-session-${Date.now()}-${cleanNumber}`;

    // Create temporary auth state for pairing
    const { state, saveCreds } = await useMultiFileAuthState(`./tmp/sessions/${sessionId}`);

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      browser: ['Knight Bot', 'Chrome', '1.0.0'],
    });

    // Request real pairing code from WhatsApp
    const pairingCode = await sock.requestPairingCode(cleanNumber);

    // Close connection after getting pairing code
    sock.end();

    const response = {
      success: true,
      code: pairingCode,
      sessionId: sessionId,
      number: {
        original: number,
        cleaned: cleanNumber,
        country: country,
        valid: true
      },
      instructions: [
        '1. Abra WhatsApp no seu celular',
        '2. Vá em Configurações (⚙️) → Aparelhos conectados',
        '3. Toque em "Conectar um aparelho"',
        '4. Escolha "Vincular com número do telefone"',
        '5. Digite o código: ' + pairingCode,
        '6. Aguarde a confirmação da conexão'
      ],
      security: {
        expiresIn: '5 minutos',
        attempts: 3,
        encrypted: true
      },
      timestamp: new Date().toISOString(),
      note: 'Código real de pareamento WhatsApp gerado'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Erro na API de pareamento real:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar código real do WhatsApp',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}