// Vercel API endpoint
module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.status(200).json({
        message: 'Knight Bot API endpoint working!',
        timestamp: new Date().toISOString(),
        path: req.url
    });
};