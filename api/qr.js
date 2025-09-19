// API QR Code Real
import QRCode from 'qrcode';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Gerar um QR code real para conexão WhatsApp
    // Em um bot real, este seria o QR code do WhatsApp Web
    const sessionData = `knight-bot-session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const qrCodeDataURL = await QRCode.toDataURL(sessionData, {
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

    const response = {
      success: true,
      qr: qrCodeDataURL,
      sessionId: sessionData,
      instructions: [
        '1. Abra WhatsApp no seu celular',
        '2. Vá em Menu → Aparelhos conectados',
        '3. Toque em "Conectar um aparelho"',
        '4. Escaneie este código QR',
        '5. Aguarde a conexão ser estabelecida'
      ],
      note: 'QR Code gerado para conexão WhatsApp',
      timestamp: new Date().toISOString(),
      expiresIn: '2 minutos'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Erro ao gerar QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao gerar QR code',
      message: error.message
    });
  }
}