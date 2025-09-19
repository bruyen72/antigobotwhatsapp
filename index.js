// Ultra simple Vercel function
export default function handler(req, res) {
    try {
        res.status(200).json({
            success: true,
            message: 'Hello from Vercel!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
}