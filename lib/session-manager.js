// Gerenciador de sessões WhatsApp ativas
import { makeWASocket, DisconnectReason, makeCacheableSignalKeyStore, initAuthCreds } from '@whiskeysockets/baileys';
import P from 'pino';

const logger = P({ level: 'silent' });

// Armazenar sessões ativas em memória global
global.activeSessions = global.activeSessions || new Map();

// Auth state persistente para cada sessão
function createSessionAuthState(sessionId) {
  if (!global.activeSessions.has(sessionId)) {
    global.activeSessions.set(sessionId, {
      creds: initAuthCreds(),
      keys: {},
      socket: null,
      connected: false,
      createdAt: Date.now(),
      lastActivity: Date.now()
    });
  }

  const session = global.activeSessions.get(sessionId);

  return {
    state: {
      creds: session.creds,
      keys: session.keys
    },
    saveCreds: () => {
      session.lastActivity = Date.now();
      global.activeSessions.set(sessionId, session);
    }
  };
}

export async function createPersistentConnection(sessionId, phoneNumber) {
  try {
    console.log(`Criando conexão persistente para: ${sessionId}`);

    const { state, saveCreds } = createSessionAuthState(sessionId);

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      browser: ['Knight Bot WhatsApp', 'Desktop', '1.0.0'],
      markOnlineOnConnect: false,
      fireInitQueries: false,
      emitOwnEvents: false,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 120000,  // 2 minutos para dar mais tempo
      defaultQueryTimeoutMs: 120000,  // 2 minutos
      keepAliveIntervalMs: 20000,  // 20 segundos - mais frequente
      qrTimeout: 120000,  // 2 minutos para QR
      mobile: false,
      // Configurações para manter conexão mais estável durante pareamento
      retryRequestDelayMs: 1000,  // Aumentar delay entre tentativas
      maxMsgRetryCount: 10,  // Mais tentativas
      // Browser mais específico
      version: [2, 2413, 51],
      // Configurações adicionais para estabilidade
      shouldIgnoreJid: () => false,
      shouldSyncHistoryMessage: () => false,
      transactionOpts: {
        maxCommitRetries: 10,
        delayBetweenTriesMs: 3000
      },
      // Configurações específicas para containers Render
      socketConfig: {
        timeout: 120000,  // 2 minutos
        keepalive: true,
        keepaliveInitialDelay: 30000,  // 30 segundos
        keepaliveInterval: 30000,  // A cada 30 segundos
        keepaliveMaxRetries: 10
      },
      // Configurações de WebSocket para ambientes containerizados
      options: {
        headers: {
          'User-Agent': 'Knight Bot WhatsApp/1.0.0'
        },
        timeout: 120000,
        handshakeTimeout: 120000,  // Aumentar timeout do handshake
        perMessageDeflate: false  // Desabilitar compressão que pode causar problemas
      }
    });

    const session = global.activeSessions.get(sessionId);
    session.socket = sock;

    // Event handlers com persistência melhorada
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      console.log(`Sessão ${sessionId} - Connection update:`, connection);

      if (qr) {
        console.log(`📱 QR code gerado para sessão ${sessionId}`);
        session.qr = qr;
        session.lastActivity = Date.now();
        session.status = 'qr_generated';
      }

      if (connection === 'connecting') {
        console.log(`🔄 Sessão ${sessionId} conectando...`);
        session.lastActivity = Date.now();
        session.status = 'connecting';
      }

      if (connection === 'open') {
        session.connected = true;
        session.lastActivity = Date.now();
        session.status = 'connected';
        console.log(`🟢 Sessão ${sessionId} conectada com sucesso! WhatsApp pareado.`);

        // Manter conexão ativa por mais tempo após pareamento
        setTimeout(() => {
          if (session.socket && session.connected) {
            console.log(`✅ Mantendo sessão ${sessionId} ativa para uso...`);
          }
        }, 5000);
      }

      if (connection === 'close') {
        session.connected = false;
        const errorCode = lastDisconnect?.error?.output?.statusCode;

        console.log(`Sessão ${sessionId} fechou. Código: ${errorCode}`);

        // Prevenir loop infinito - verificar se já tem código gerado
        const timeSinceCreation = Date.now() - session.createdAt;
        const maxSessionTime = 15 * 60 * 1000; // 15 minutos
        const hasValidCode = session.pairingCode && session.status === 'pairing_code_generated';

        // Se erro 405/428 e já tem código válido, NÃO reconectar
        if ((errorCode === 405 || errorCode === 428) && hasValidCode) {
          console.log(`🛑 Código ${session.pairingCode} já gerado, aguardando pareamento no celular...`);
          session.status = 'waiting_for_pairing';
          return; // Não reconectar, apenas aguardar
        }

        // Reconectar apenas se não foi logout, não tem código ainda, e dentro do tempo
        if (errorCode !== DisconnectReason.loggedOut && !hasValidCode && timeSinceCreation < maxSessionTime) {
          console.log(`🔄 Tentando reconectar sessão ${sessionId} em 5 segundos...`);
          setTimeout(() => {
            if (global.activeSessions.has(sessionId) && !global.activeSessions.get(sessionId).pairingCode) {
              createPersistentConnection(sessionId, phoneNumber);
            }
          }, 5000); // Aumentar delay para evitar spam
        } else {
          console.log(`❌ Sessão ${sessionId} finalizada. Motivo: ${errorCode === DisconnectReason.loggedOut ? 'Logout' : hasValidCode ? 'Código gerado' : 'Timeout'}`);
          if (!hasValidCode) {
            global.activeSessions.delete(sessionId);
          }
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Aguardar conexão estar pronta antes de gerar código
    if (phoneNumber) {
      console.log(`📞 Preparando geração de código para ${phoneNumber} na sessão ${sessionId}`);

      // Aguardar conexão estabelecer
      let connectionReady = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 segundos máximo

      while (!connectionReady && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        // Verificar se a conexão está em estado "connecting" ou "open"
        if (session.status === 'connecting' || session.connected) {
          console.log(`✅ Conexão pronta após ${attempts}s, gerando código...`);
          connectionReady = true;
        } else {
          console.log(`⏳ Aguardando conexão... tentativa ${attempts}/${maxAttempts}`);
        }
      }

      if (!connectionReady) {
        throw new Error('Timeout aguardando conexão estabilizar');
      }

      // Aguardar mais um pouco para garantir estabilidade
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const pairingCode = await sock.requestPairingCode(phoneNumber);
        console.log(`🔑 Código gerado com sucesso: ${pairingCode} para sessão ${sessionId}`);

        session.pairingCode = pairingCode;
        session.phoneNumber = phoneNumber;
        session.lastActivity = Date.now();
        session.status = 'pairing_code_generated';

        global.activeSessions.set(sessionId, session);

        return {
          success: true,
          code: pairingCode,
          sessionId: sessionId,
          phoneNumber: phoneNumber,
          status: session.status
        };
      } catch (error) {
        console.error(`❌ Erro ao gerar código: ${error.message}`);
        throw error;
      }
    }

    return { success: true, sessionId: sessionId };

  } catch (error) {
    console.error(`Erro ao criar conexão para ${sessionId}:`, error);
    return { success: false, error: error.message };
  }
}

export function getSession(sessionId) {
  return global.activeSessions.get(sessionId);
}

export function getAllSessions() {
  return Array.from(global.activeSessions.entries()).map(([id, session]) => ({
    id,
    connected: session.connected,
    phoneNumber: session.phoneNumber,
    pairingCode: session.pairingCode,
    lastActivity: session.lastActivity
  }));
}

// Cleanup de sessões antigas (executar periodicamente)
export function cleanupOldSessions() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutos

  for (const [sessionId, session] of global.activeSessions) {
    if (now - session.lastActivity > maxAge) {
      console.log(`Removendo sessão antiga: ${sessionId}`);
      if (session.socket) {
        session.socket.end();
      }
      global.activeSessions.delete(sessionId);
    }
  }
}

// Cleanup automático a cada 10 minutos
setInterval(cleanupOldSessions, 10 * 60 * 1000);