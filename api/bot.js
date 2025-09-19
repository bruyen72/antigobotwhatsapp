// Simple bot endpoint
export default function handler(req, res) {
    res.status(200).json({
        status: 'ready',
        message: 'Bot endpoint available',
        note: 'WhatsApp functionality temporarily disabled for stability'
    });
}