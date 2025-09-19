// API de Pareamento WhatsApp Real
import { createPersistentConnection, getSession } from '../lib/session-manager.js';

// Rate limiting simples em memória
const requestTracker = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_REQUESTS_PER_NUMBER = 3; // Máximo 3 tentativas por número por minuto

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
    // Validação E.164 conforme especificação (CRÍTICO para Baileys)
    let cleanNumber = number.replace(/[^0-9]/g, '');

    // Remover + se presente (E.164 sem +)
    if (number.startsWith('+')) {
      cleanNumber = number.substring(1).replace(/[^0-9]/g, '');
    }

    console.log(`📞 Processando número: ${number} → ${cleanNumber}`);

    // Rate limiting check
    const now = Date.now();
    const requests = requestTracker.get(cleanNumber) || [];
    const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);

    if (recentRequests.length >= MAX_REQUESTS_PER_NUMBER) {
      return res.status(429).json({
        success: false,
        error: 'Muitas tentativas',
        details: `Máximo ${MAX_REQUESTS_PER_NUMBER} tentativas por minuto para este número`,
        retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - recentRequests[0])) / 1000) + 's',
        number: cleanNumber
      });
    }

    // Registrar esta tentativa
    recentRequests.push(now);
    requestTracker.set(cleanNumber, recentRequests);

    // Validações E.164 estritas
    if (cleanNumber.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Número inválido - muito curto',
        details: 'Formato E.164 requer mín. 10 dígitos (código país + número)',
        received: cleanNumber,
        examples: {
          brasil: '5565984660212',
          eua: '15551234567',
          reino_unido: '447911123456'
        },
        note: 'Não use + no início'
      });
    }

    if (cleanNumber.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'Número inválido - muito longo',
        details: 'Formato E.164 permite máx. 15 dígitos',
        received: cleanNumber,
        length: cleanNumber.length
      });
    }

    // Validação específica para números brasileiros
    if (cleanNumber.startsWith('55') && cleanNumber.length !== 13) {
      return res.status(400).json({
        success: false,
        error: 'Número brasileiro inválido',
        details: 'Números do Brasil devem ter 13 dígitos: 55 + DDD + 9 + 8 dígitos',
        received: cleanNumber,
        example: '5565984660212',
        format: '55 (código país) + 65 (DDD) + 9 + 84660212'
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