// Pairing code generation endpoint for Vercel
module.exports = async (req, res) => {
    try {
        // Set CORS headers
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
                error: 'Número de telefone é obrigatório'
            });
        }

        // Clean the phone number
        const cleanNumber = number.replace(/[^0-9]/g, '');

        if (cleanNumber.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Número de telefone inválido'
            });
        }

        // For now, generate a mock pairing code
        // In a full implementation, this would interface with the WhatsApp bot
        const mockCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const formattedCode = mockCode.match(/.{1,2}/g)?.join('-') || mockCode;

        console.log(`Pairing code requested for number: ${cleanNumber}`);
        console.log(`Generated mock code: ${formattedCode}`);

        res.status(200).json({
            success: true,
            code: formattedCode,
            number: cleanNumber,
            message: 'Código de pareamento gerado com sucesso'
        });

    } catch (error) {
        console.error('Pairing endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};