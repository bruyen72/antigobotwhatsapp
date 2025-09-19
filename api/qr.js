// API QR Code (placeholder)
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // QR Code SVG simples como placeholder
  const qrSvg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <g fill="black">
        <rect x="20" y="20" width="160" height="20"/>
        <rect x="20" y="60" width="20" height="80"/>
        <rect x="40" y="80" width="40" height="20"/>
        <rect x="100" y="40" width="60" height="20"/>
        <rect x="120" y="80" width="60" height="20"/>
        <rect x="20" y="160" width="160" height="20"/>
        <rect x="160" y="60" width="20" height="80"/>
      </g>
      <text x="100" y="110" text-anchor="middle" font-family="Arial" font-size="10" fill="gray">
        QR MOCK
      </text>
    </svg>
  `;

  const response = {
    success: true,
    qr: `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString('base64')}`,
    instructions: [
      '1. Abra WhatsApp no seu celular',
      '2. Vá em Menu → Aparelhos conectados',
      '3. Toque em "Conectar um aparelho"',
      '4. Escaneie este QR Code'
    ],
    note: 'Este é um QR Code MOCK para demonstração',
    timestamp: new Date().toISOString()
  };

  res.status(200).json(response);
}