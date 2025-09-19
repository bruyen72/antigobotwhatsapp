// Vercel serverless function handler - Simplified for debugging
module.exports = async (req, res) => {
    try {
        console.log('📡 Function invoked:', req.url, req.method);

        // Set proper headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Simple response for debugging
        const response = {
            status: 'active',
            message: 'Knight Bot API is running on Vercel!',
            timestamp: new Date().toISOString(),
            url: req.url,
            method: req.method,
            headers: req.headers,
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: process.env.VERCEL || 'false'
            }
        };

        console.log('✅ Response sent successfully');
        return res.status(200).json(response);

    } catch (error) {
        console.error('❌ Error in serverless function:', error);

        // Ensure we always return a response
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};