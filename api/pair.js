// API de Pareamento WhatsApp Real
import { createPersistentConnection, getSession } from '../lib/session-manager.js';

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

    // Criar conexão persistente e gerar código
    const sessionId = `pair-session-${Date.now()}-${cleanNumber}`;

    console.log(`Criando sessão persistente para: ${cleanNumber}`);

    const result = await createPersistentConnection(sessionId, cleanNumber);

    if (!result.success) {
      throw new Error(result.error || 'Falha ao criar conexão persistente');
    }

    const pairingCode = result.code;

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
        '6. A sessão fica ativa por 30 minutos para conexão'
      ],
      session: {
        id: sessionId,
        status: 'ativa',
        expiresIn: '30 minutos',
        persistent: true,
        phoneNumber: cleanNumber
      },
      timestamp: new Date().toISOString(),
      note: 'Código real do WhatsApp com sessão persistente'
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