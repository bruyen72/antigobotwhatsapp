// Simple Vercel entry point - Test version
module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
        message: 'Knight Bot is running!',
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method
    });
};