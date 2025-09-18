# 🌐 Interface Web - Knight Bot

## ✨ Características

- **Interface Web Completa** em Português Brasileiro
- **Geração de Código de Pareamento** via web
- **QR Code** para conexão rápida
- **Interface Responsiva** para mobile e desktop
- **Integração Total** com o bot principal

## 🚀 Como Usar

### 1. Instalar Dependências
```bash
npm install
```

### 2. Iniciar Bot com Interface Web
```bash
npm run start:web
```

### 3. Acessar Interface
- Abra seu navegador em: `http://localhost:3000`
- Use seu celular ou computador

## 📱 Funcionalidades da Interface

### 🔑 Código de Pareamento
1. Clique em "Código de Pareamento"
2. Digite seu número com código do país (+5565984660212)
3. Clique em "Gerar Código de Pareamento"
4. Use o código no WhatsApp:
   - Configurações → Aparelhos conectados
   - "Conectar um aparelho"
   - Digite o código

### 📱 QR Code
1. Clique em "Código QR"
2. Escaneie com seu WhatsApp
3. Conexão automática

## 🛠️ Configuração para Deploy

### Render.com
1. Conecte seu repositório no Render
2. Configure as variáveis:
   - `PORT`: Deixe vazio (Render define automaticamente)
   - `NODE_ENV`: `production`
3. Comando de build: `npm install`
4. Comando de start: `npm run start:web`

### Heroku
```bash
# Criar app
heroku create seu-bot-name

# Deploy
git push heroku main

# Abrir interface
heroku open
```

### VPS/Servidor
```bash
# Instalar PM2
npm install -g pm2

# Iniciar com PM2
pm2 start start.js --name "knight-bot"

# Salvar configuração
pm2 save
pm2 startup
```

## 🔧 Configurações Avançadas

### Porta Personalizada
```bash
PORT=8080 npm run start:web
```

### SSL/HTTPS
```javascript
// No server.js, adicione:
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);
```

## 📊 Rotas da API

- `GET /` - Interface principal
- `GET /pair?number=5565984660212` - Gerar código de pareamento
- `GET /qr` - Obter QR code
- `GET /status` - Status do bot

## 🔍 Troubleshooting

### Bot não conecta
1. Verifique se o servidor web está rodando
2. Confirme que a porta 3000 está disponível
3. Restart: `npm run start:web`

### Interface não carrega
1. Verifique a URL: `http://localhost:3000`
2. Limpe cache do navegador
3. Tente modo privado/incógnito

### Código não funciona
1. Verifique formato do número (+DDI + número)
2. Aguarde alguns segundos entre tentativas
3. Reinicie o bot se necessário

## 📦 Estrutura de Arquivos

```
projeto/
├── plublic/
│   └── index.html      # Interface web (PT-BR)
├── server.js           # Servidor Express
├── start.js           # Script de inicialização
├── index.js           # Bot principal
└── package.json       # Dependências
```

## 🎯 Pronto para Deploy!

A interface está **100% em português brasileiro** e pronta para:
- ✅ Render.com
- ✅ Heroku
- ✅ Vercel
- ✅ VPS próprio
- ✅ Localhost

**🚀 Inicie agora:** `npm run start:web`