// Gerenciador de sessões WhatsApp ativas
import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import P from 'pino';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const logger = P({ level: 'silent' });

// Armazenar sessões ativas em memória global
global.activeSessions = global.activeSessions || new Map();

// Auth state persistente para cada sessão usando arquivos
async function createSessionAuthState(sessionId) {
  // Criar diretório de auth se não existir
  const authDir = join(process.cwd(), 'auth', sessionId);
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  try {
    // Usar useMultiFileAuthState conforme documentação
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    // Inicializar sessão se não existir
    if (!global.activeSessions.has(sessionId)) {
      global.activeSessions.set(sessionId, {
        socket: null,
        connected: false,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        authDir: authDir
      });
    }

    const session = global.activeSessions.get(sessionId);
    session.lastActivity = Date.now();

    return {
      state,
      saveCreds: () => {
        session.lastActivity = Date.now();
        global.activeSessions.set(sessionId, session);
        saveCreds();
      }
    };
  } catch (error) {
    console.error(`Erro ao criar auth state para ${sessionId}:`, error);
    throw error;
  }
}

export async function createPersistentConnection(sessionId, phoneNumber) {
  try {
    console.log(`Criando conexão persistente para: ${sessionId}`);

    const { state, saveCreds } = await createSessionAuthState(sessionId);

    const sock = makeWASocket({
      auth: state,
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
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        const errorCode = lastDisconnect?.error?.output?.statusCode;

        console.log(`🔌 Sessão ${sessionId} fechou. Código: ${errorCode}, Deve reconectar: ${shouldReconnect}`);

        // Verificar se já tem código gerado
        const hasValidCode = session.pairingCode && session.status === 'pairing_code_generated';
        const timeSinceCreation = Date.now() - session.createdAt;
        const maxSessionTime = 15 * 60 * 1000; // 15 minutos

        // Lógica de reconexão melhorada conforme documentação Baileys
        if (shouldReconnect && timeSinceCreation < maxSessionTime) {
          // Se já tem código válido, apenas aguardar sem reconectar
          if (hasValidCode) {
            console.log(`🟡 Código ${session.pairingCode} já gerado, sessão aguardando pareamento...`);
            session.status = 'waiting_for_pairing';
            return;
          }

          // Reconectar apenas se não tem código ainda
          console.log(`🔄 Reconectando sessão ${sessionId} em 3 segundos...`);
          setTimeout(() => {
            if (global.activeSessions.has(sessionId)) {
              console.log(`♻️ Iniciando reconexão para ${sessionId}`);
              createPersistentConnection(sessionId, phoneNumber);
            }
          }, 3000);
        } else {
          // Finalizar sessão
          const reason = errorCode === DisconnectReason.loggedOut ? 'Logout pelo usuário' :
                        timeSinceCreation >= maxSessionTime ? 'Timeout (15min)' :
                        'Erro de conexão';
          console.log(`❌ Sessão ${sessionId} finalizada. Motivo: ${reason}`);

          // Só deletar se não tem código válido para usar
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