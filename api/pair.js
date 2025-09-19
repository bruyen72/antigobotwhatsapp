// API de Pareamento WhatsApp
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { number } = req.query;

  if (!number) {
    return res.status(400).json({
      success: false,
      error: 'Número de telefone é obrigatório',
      example: '/api/pair?number=5511999999999'
    });
  }

  // Validação básica do número
  const cleanNumber = number.replace(/[^0-9]/g, '');

  if (cleanNumber.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Número muito curto. Use formato: código do país + número',
      example: '5511999999999'
    });
  }

  // Gerar código mock
  const codeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let mockCode = '';
  for (let i = 0; i < 8; i++) {
    mockCode += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
  }

  const formattedCode = mockCode.match(/.{1,4}/g)?.join('-') || mockCode;

  res.status(200).json({
    success: true,
    code: formattedCode,
    number: cleanNumber,
    instructions: [
      '1. Abra WhatsApp no seu celular',
      '2. Vá em Configurações > Aparelhos conectados',
      '3. Toque em "Conectar um aparelho"',
      '4. Digite o código: ' + formattedCode
    ],
    note: 'Este é um código MOCK para demonstração',
    timestamp: new Date().toISOString()
  });
}