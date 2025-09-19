// Simple QR endpoint - no external deps
export default function handler(req, res) {
    res.status(200).json({
        message: 'QR endpoint working',
        placeholder: 'QR generation temporarily disabled'
    });
}