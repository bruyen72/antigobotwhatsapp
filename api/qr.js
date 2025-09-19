// QR Code generation endpoint for Vercel
const QRCode = require('qrcode');

module.exports = async (req, res) => {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // For now, return a placeholder response
        // In a full implementation, this would get the actual QR from the bot
        const placeholderData = 'WhatsApp Bot - QR Code will be generated here';

        try {
            const qrCode = await QRCode.toDataURL(placeholderData);

            res.status(200).json({
                success: true,
                qr: qrCode,
                instructions: [
                    '1. Abra o WhatsApp no seu celular',
                    '2. Vá em Menu → Aparelhos conectados',
                    '3. Toque em "Conectar um aparelho"',
                    '4. Escaneie este código QR'
                ]
            });
        } catch (qrError) {
            console.error('QR generation error:', qrError);
            res.status(500).json({
                success: false,
                error: 'Falha ao gerar código QR'
            });
        }

    } catch (error) {
        console.error('QR endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};