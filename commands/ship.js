const { chromium } = require('playwright');

// Cache de imagens para não buscar toda vez
let cachedImages = [];
let lastFetch = 0;
const CACHE_DURATION = 3600000; // 1 hora em milissegundos

// Função para buscar imagens do Pinterest automaticamente
async function fetchPinterestImages() {
    try {
        // Verificar cache
        if (cachedImages.length > 0 && (Date.now() - lastFetch) < CACHE_DURATION) {
            console.log('📥 Usando cache de imagens...');
            return cachedImages;
        }

        console.log('🔍 Buscando imagens do Pinterest...');
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });
        
        const page = await browser.newPage();
        
        // Simular navegador real com headers adicionais
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
        });
        
        // Ir para a página de busca do Pinterest
        const searchUrl = 'https://br.pinterest.com/search/pins/?q=anime%20ships%20fanart%20boy%20and%20female&rs=typed';
        await page.goto(searchUrl, {
            waitUntil: 'networkidle',
            timeout: 30000 // Timeout de 30 segundos para evitar hangs
        });

        // Esperar carregar elementos iniciais
        await page.waitForSelector('img', { timeout: 10000 });

        // Scroll para carregar mais imagens (aumentado para mais resultados)
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2500); // Aumentado para dar tempo de carregar
        }

        // Extrair links das imagens com seletor mais robusto
        const imageLinks = await page.evaluate(() => {
            const images = document.querySelectorAll('img[src*="i.pinimg.com"]');
            const links = [];
            
            images.forEach(img => {
                let src = img.src || img.getAttribute('srcset')?.split(' ')[0];
                if (src && src.includes('i.pinimg.com') && !src.includes('/avatars/') && !src.includes('/profile/')) {
                    // Converter para formato de alta qualidade (ajustado para padrões comuns do Pinterest)
                    src = src.replace(/\/(236x|474x|564x|736x|originals)\//, '/564x/');
                    src = src.replace(/_(75x75|170x|236x|564x|736x)\./, '_564x.');
                    if (!links.includes(src)) {
                        links.push(src);
                    }
                }
            });
            
            return links;
        });

        await browser.close();

        if (imageLinks.length > 0) {
            cachedImages = imageLinks.slice(0, 30); // Aumentado para 30 para mais variedade
            lastFetch = Date.now();
            console.log(`✅ Encontradas ${cachedImages.length} imagens de anime ships!`);
            return cachedImages;
        } else {
            throw new Error('Nenhuma imagem encontrada');
        }

    } catch (error) {
        console.error('❌ Erro ao buscar no Pinterest:', error.message);
        
        // Fallback com imagens padrão variadas (adicionadas mais para robustez)
        return [
            'https://i.pinimg.com/564x/a8/7b/4c/a87b4c2f8e5d1a9b3c6e8f4a7b5c2d1e.jpg',
            'https://i.pinimg.com/564x/d3/2a/8f/d32a8f5b4e7c1a6d9b2f5e8a4c7b0d3a.jpg',
            'https://i.pinimg.com/564x/6e/9c/5a/6e9c5a1b8d4f7a2e5c9b6f3a8d1e4c7b.jpg',
            'https://i.pinimg.com/564x/b4/5f/3c/b45f3c8a7e1d4b9f6c2a5d8e1f4c7a0b.jpg',
            'https://i.pinimg.com/564x/f7/1e/6b/f71e6b9c2d5a8f4b7e0c3a6d9f2e5b8c.jpg',
            'https://i.pinimg.com/564x/2f/8d/1a/2f8d1a4b6c7e9f0a1d2b3c4e5f6a7b8c.jpg',
            'https://i.pinimg.com/564x/4a/3b/2c/4a3b2c5d6e7f8a9b0c1d2e3f4a5b6c7d.jpg',
            'https://i.pinimg.com/564x/8c/7d/6e/8c7d6e9f0a1b2c3d4e5f6a7b8c9d0e1f.jpg',
            'https://i.pinimg.com/564x/1f/0e/9d/1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c.jpg',
            'https://i.pinimg.com/564x/3d/2c/1b/3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a.jpg'
        ];
    }
}

async function shipCommand(sock, chatId, message, args) {
    try {
        let user1, user2;
        
        // Pegar mentions do contexto da mensagem
        const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        // Filtrar para garantir que sejam JIDs válidos
        const validMentions = mentions.filter(jid => jid && jid.endsWith('@s.whatsapp.net'));

        if (validMentions.length >= 2) {
            user1 = validMentions[0];
            user2 = validMentions[1];
        } else if (validMentions.length === 1) {
            const groupData = await sock.groupMetadata(chatId);
            const participants = groupData.participants.map(p => p.id).filter(id => id.endsWith('@s.whatsapp.net'));
            
            user1 = validMentions[0];
            const others = participants.filter(p => p !== user1);
            
            if (others.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: '💔 Preciso de mais pessoas no grupo para shippar!'
                });
            }
            
            user2 = others[Math.floor(Math.random() * others.length)];
        } else {
            const groupData = await sock.groupMetadata(chatId);
            const participants = groupData.participants.map(p => p.id).filter(id => id.endsWith('@s.whatsapp.net'));
            
            if (participants.length < 2) {
                return await sock.sendMessage(chatId, {
                    text: '💔 Grupo muito pequeno para shippar!'
                });
            }
            
            user1 = participants[Math.floor(Math.random() * participants.length)];
            do {
                user2 = participants[Math.floor(Math.random() * participants.length)];
            } while (user2 === user1);
        }

        // Buscar imagens automaticamente do Pinterest
        const animeShipImages = await fetchPinterestImages();

        // Compatibilidade aleatória
        const compatibility = Math.floor(Math.random() * 101);
        
        let status, emoji;
        if (compatibility >= 90) {
            status = 'PERFEITOS! 💖✨';
            emoji = '🔥💕';
        } else if (compatibility >= 70) {
            status = 'Muito bom! 😍';
            emoji = '💕✨';
        } else if (compatibility >= 50) {
            status = 'Boa química! 😌';
            emoji = '💛🌸';
        } else if (compatibility >= 30) {
            status = 'Podem tentar... 🤔';
            emoji = '😅💙';
        } else {
            status = 'Melhor como amigos! 😬';
            emoji = '💔🤷‍♀️';
        }

        // Imagem aleatória das buscadas
        const randomImg = animeShipImages[Math.floor(Math.random() * animeShipImages.length)];

        const shipText = `💘 *ANIME SHIP* 💘

${emoji} @${user1.split('@')[0]} ❤️ @${user2.split('@')[0]}

📊 *${compatibility}%* - ${status}

✨ *Pinterest Auto-Search!* 🎯`;

        await sock.sendMessage(chatId, {
            image: { url: randomImg },
            caption: shipText,
            mentions: [user1, user2]
        });

    } catch (error) {
        console.error('❌ Erro no comando ship:', error.message);
        
        await sock.sendMessage(chatId, {
            text: `❌ *Erro no Ship*

💡 *Como usar:*
• \`.ship\` - Ship random no grupo
• \`.ship @user\` - Ship com você + user  
• \`.ship @user1 @user2\` - Ship específico entre dois users`
        });
    }
}

module.exports = shipCommand;