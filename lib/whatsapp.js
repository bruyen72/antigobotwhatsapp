import { makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys'
import P from 'pino'

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))
logger.level = 'silent'

let activeConnections = new Map()

export async function createWhatsAppConnection(sessionId) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`)

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      browser: ['Knight Bot', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: true,
    })

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
        if (shouldReconnect) {
          createWhatsAppConnection(sessionId)
        } else {
          activeConnections.delete(sessionId)
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connection opened for session:', sessionId)
      }
    })

    sock.ev.on('creds.update', saveCreds)

    activeConnections.set(sessionId, sock)
    return sock

  } catch (error) {
    console.error('Error creating WhatsApp connection:', error)
    throw error
  }
}

export function getConnection(sessionId) {
  return activeConnections.get(sessionId)
}

export function getAllConnections() {
  return activeConnections
}

export async function generatePairingCode(phoneNumber) {
  try {
    const sessionId = `session-${Date.now()}-${phoneNumber}`
    const sock = await createWhatsAppConnection(sessionId)

    const code = await sock.requestPairingCode(phoneNumber)

    return {
      success: true,
      code: code,
      sessionId: sessionId,
      phoneNumber: phoneNumber
    }
  } catch (error) {
    console.error('Error generating pairing code:', error)
    return {
      success: false,
      error: error.message
    }
  }
}