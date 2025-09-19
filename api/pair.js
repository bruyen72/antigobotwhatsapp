// Simple pair endpoint
export default function handler(req, res) {
    const mockCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const formattedCode = mockCode.match(/.{1,2}/g)?.join('-') || mockCode;

    res.status(200).json({
        success: true,
        code: formattedCode,
        message: 'Mock pairing code generated'
    });
}