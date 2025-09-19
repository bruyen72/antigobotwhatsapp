// WhatsApp Bot endpoint - Isolated from main function
module.exports = async (req, res) => {
    try {
        console.log('🤖 Bot endpoint called:', req.url, req.method);

        // Set proper headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Avoid importing heavy dependencies that might crash
        // Only import when actually needed
        if (req.url === '/bot/start') {
            try {
                // Dynamic import to prevent crashes during cold start
                const startBot = require('../index');

                return res.status(200).json({
                    status: 'starting',
                    message: 'Bot initialization started',
                    timestamp: new Date().toISOString()
                });
            } catch (botError) {
                console.error('Bot start error:', botError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to start bot',
                    error: botError.message
                });
            }
        }

        // Status endpoint
        return res.status(200).json({
            status: 'ready',
            message: 'WhatsApp Bot endpoint ready',
            timestamp: new Date().toISOString(),
            available_endpoints: [
                '/bot/start',
                '/bot/status'
            ]
        });

    } catch (error) {
        console.error('❌ Bot endpoint error:', error);
        return res.status(500).json({
            error: 'Bot endpoint error',
            message: error.message
        });
    }
};