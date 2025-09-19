// Vercel serverless function handler
const { setBotInstance, updateQR, server } = require('./server');

let botStarted = false;

async function startBot() {
    if (botStarted) return;
    botStarted = true;

    console.log('🚀 Iniciando Knight Bot no Vercel...');

    // Import and start the main bot
    require('./index');

    console.log('✅ Knight Bot iniciado com sucesso no Vercel!');
}

module.exports = async (req, res) => {
    try {
        // Start bot if not started
        await startBot();

        // Handle the request
        if (req.url === '/') {
            res.status(200).json({
                status: 'online',
                message: 'Knight Bot is running on Vercel!',
                timestamp: new Date().toISOString()
            });
        } else if (req.url === '/status') {
            res.status(200).json({
                status: 'active',
                uptime: process.uptime(),
                memory: process.memoryUsage()
            });
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (error) {
        console.error('Error in serverless function:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};