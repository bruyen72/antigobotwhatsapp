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

        // Só reconectar se não foi logout e ainda está dentro do tempo limite
        const timeSinceCreation = Date.now() - session.createdAt;
        const maxSessionTime = 15 * 60 * 1000; // 15 minutos para dar mais tempo para pareamento

        // Reconectar imediatamente se não foi logout e está esperando pareamento
        if (errorCode !== DisconnectReason.loggedOut && timeSinceCreation < maxSessionTime) {
          console.log(`🔄 Reconectando sessão ${sessionId} imediatamente...`);
          setTimeout(() => {
            if (global.activeSessions.has(sessionId)) {
              createPersistentConnection(sessionId, phoneNumber);
            }
          }, 1000); // Reduzir delay para reconectar mais rápido
        } else {
          console.log(`❌ Sessão ${sessionId} finalizada. Motivo: ${errorCode === DisconnectReason.loggedOut ? 'Logout' : 'Timeout'}`);
          global.activeSessions.delete(sessionId);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Gerar código de pareamento se número fornecido
    if (phoneNumber) {
      console.log(`📞 Gerando código de pareamento para ${phoneNumber} na sessão ${sessionId}`);

      // Aguardar um pouco antes de gerar o código para garantir conexão estável
      await new Promise(resolve => setTimeout(resolve, 2000));

      const pairingCode = await sock.requestPairingCode(phoneNumber);
      console.log(`🔑 Código gerado: ${pairingCode} para sessão ${sessionId}`);

      session.pairingCode = pairingCode;
      session.phoneNumber = phoneNumber;
      session.lastActivity = Date.now();
      session.status = 'pairing_code_generated';

      global.activeSessions.set(sessionId, session);

      // Log para acompanhar estado da sessão
      console.log(`📋 Estado da sessão ${sessionId}:`, {
        connected: session.connected,
        pairingCode: session.pairingCode,
        status: session.status,
        createdAt: new Date(session.createdAt).toISOString()
      });

      return {
        success: true,
        code: pairingCode,
        sessionId: sessionId,
        phoneNumber: phoneNumber,
        status: session.status
      };
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