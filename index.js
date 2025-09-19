// Simple entrypoint for Vercel
export default function handler(req, res) {
  res.status(200).json({
    message: 'Knight Bot is working!',
    timestamp: new Date().toISOString(),
    status: 'online'
  });
}