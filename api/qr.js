// API QR Code Real WhatsApp
import QRCode from 'qrcode';
import { makeWASocket, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino';
import { useMemoryAuthState } from '../lib/auth-state.js';

const logger = P({ level: 'silent' });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sessionId = `qr-session-${Date.now()}`;
    let qrCodeData = null;

    // Use in-memory auth state for serverless
    const { state, saveCreds } = useMemoryAuthState();

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      browser: ['Knight Bot', 'Chrome', '1.0.0'],
    });

    // Promise to capture QR code
    const qrPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('QR code generation timeout'));
      }, 15000);

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          clearTimeout(timeout);
          resolve(qr);
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
          if (!shouldReconnect) {
            clearTimeout(timeout);
            reject(new Error('Connection closed'));
          }
        }
      });
    });

    // Wait for QR code
    qrCodeData = await qrPromise;

    // Generate QR code image from WhatsApp QR data
    const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });

    // Close connection after getting QR
    sock.end();

    const response = {
      success: true,
      qr: qrCodeDataURL,
      sessionId: sessionId,
      instructions: [
        '1. Abra WhatsApp no seu celular',
        '2. Vá em Menu → Aparelhos conectados',
        '3. Toque em "Conectar um aparelho"',
        '4. Escaneie este código QR',
        '5. Aguarde a conexão ser estabelecida'
      ],
      note: 'QR Code real do WhatsApp gerado',
      timestamp: new Date().toISOString(),
      expiresIn: '20 segundos'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Erro ao gerar QR code real:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar QR code do WhatsApp',
      message: error.message
    });
  }
}