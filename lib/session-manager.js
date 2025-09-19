// Gerenciador de sessões WhatsApp ativas
import { makeWASocket, DisconnectReason, makeCacheableSignalKeyStore, initAuthCreds } from '@whiskeysockets/baileys';
import P from 'pino';

// Polyfill crypto para Baileys
import { webcrypto } from 'node:crypto';
if (!global.crypto) global.crypto = webcrypto;

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
      connectTimeoutMs: 30000,
      defaultQueryTimeoutMs: 30000,
      keepAliveIntervalMs: 15000,
      mobile: false
    });

    const session = global.activeSessions.get(sessionId);
    session.socket = sock;

    // Event handlers
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;

      console.log(`Sessão ${sessionId} - Connection update:`, connection);

      if (connection === 'open') {
        session.connected = true;
        session.lastActivity = Date.now();
        console.log(`Sessão ${sessionId} conectada com sucesso!`);
      }

      if (connection === 'close') {
        session.connected = false;
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          console.log(`Tentando reconectar sessão ${sessionId}...`);
          setTimeout(() => createPersistentConnection(sessionId, phoneNumber), 5000);
        } else {
          console.log(`Sessão ${sessionId} desconectada definitivamente`);
          global.activeSessions.delete(sessionId);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Gerar código de pareamento se número fornecido
    if (phoneNumber) {
      console.log(`Gerando código de pareamento para ${phoneNumber} na sessão ${sessionId}`);
      const pairingCode = await sock.requestPairingCode(phoneNumber);
      console.log(`Código gerado: ${pairingCode} para sessão ${sessionId}`);

      session.pairingCode = pairingCode;
      session.phoneNumber = phoneNumber;
      session.lastActivity = Date.now();

      global.activeSessions.set(sessionId, session);

      return {
        success: true,
        code: pairingCode,
        sessionId: sessionId,
        phoneNumber: phoneNumber
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