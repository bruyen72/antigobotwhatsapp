// API para testar nova implementação de conexão
import { createPersistentConnection } from '../lib/session-manager.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🧪 Iniciando teste de conexão...');

    // Criar sessão de teste
    const testSessionId = `test-session-${Date.now()}`;
    const testNumber = '5565984660212';

    console.log(`📞 Testando conexão para: ${testNumber}`);

    const result = await createPersistentConnection(testSessionId, testNumber);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Teste de conexão bem-sucedido!',
        sessionId: testSessionId,
        pairingCode: result.code,
        timestamp: new Date().toISOString(),
        instructions: [
          '✅ Nova implementação funcionando',
          '✅ useMultiFileAuthState implementado',
          '✅ Tratamento de erro 405/428 melhorado',
          '✅ Auth state persistente em arquivos',
          `📱 Código para testar: ${result.code}`,
          '🔗 Digite o código no WhatsApp do celular'
        ],
        nextSteps: [
          'Abra WhatsApp → Configurações → Aparelhos conectados',
          'Toque em "Conectar um aparelho"',
          'Escolha "Vincular com número"',
          `Digite: ${result.code}`,
          'Aguarde a conexão ser estabelecida'
        ]
      });
    } else {
      throw new Error(result.error || 'Falha no teste de conexão');
    }

  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Teste de conexão falhou',
      message: error.message,
      timestamp: new Date().toISOString(),
      troubleshooting: [
        'Verifique se todas as dependências estão instaladas',
        'Confirme que o Render tem acesso de escrita para criar arquivos',
        'Monitore os logs para erros 405/428',
        'Tente novamente em alguns segundos'
      ]
    });
  }
}