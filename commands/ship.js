const { chromium } = require('playwright');
const axios = require('axios');
const https = require('https');

// Cache de imagens para não buscar toda vez
let cachedImages = [];
let lastFetch = 0;
const CACHE_DURATION = 3600000; // 1 hora em milissegundos

// Credenciais do Pinterest (Use variáveis de ambiente!)
const PINTEREST_EMAIL = process.env.PINTEREST_EMAIL || 'brunoruthes92@gmail.com';
const PINTEREST_PASSWORD = process.env.PINTEREST_PASSWORD || 'BRPO@hulk1';

// Imagens de fallback mais confiáveis
const FALLBACK_IMAGES = [
    'https://wallpapers.com/images/hd/anime-couple-4k-1920-x-1080-wallpaper-s9kz8x2c0yyro8k1.jpg',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&crop=faces',
    'https://picsum.photos/800/600?random=1',
    'https://picsum.photos/800/600?random=2',
    'https://picsum.photos/800/600?random=3'
];

// Função melhorada para buscar imagens sem login
async function fetchAnimeShipImages() {
    let browser, context, page;
    try {
        // Verificar cache
        if (cachedImages.length > 0 && (Date.now() - lastFetch) < CACHE_DURATION) {
            console.log('📥 Usando cache de imagens...');
            return cachedImages;
        }

        console.log('🔍 Buscando imagens de anime ships...');
        
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            extraHTTPHeaders: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            viewport: { width: 1366, height: 768 }
        });
        
        page = await context.newPage();

        // Tentar múltiplas fontes de imagens
        const searchSources = [
            // Pinterest sem login (público)
            'https://www.pinterest.com/search/pins/?q=anime%20couple%20art',
            // Outras fontes alternativas
            'https://www.deviantart.com/search?q=anime+couple',
            'https://wallhaven.cc/search?q=anime+couple&categories=010&purity=100&sorting=relevance'
        ];

        let imageLinks = [];

        // Tentar Pinterest primeiro (sem login)
        try {
            console.log('🎯 Tentando Pinterest público...');
            await page.goto(searchSources[0], { 
                waitUntil: 'domcontentloaded', 
                timeout: 15000 
            });

            // Aguardar carregar
            await page.waitForTimeout(3000);

            // Scroll para carregar mais imagens
            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(1500);
            }

            // Extrair links das imagens do Pinterest
            imageLinks = await page.evaluate(() => {
                const images = document.querySelectorAll('img[src*="pinimg.com"]');
                const links = [];
                
                images.forEach(img => {
                    let src = img.src;
                    if (src && src.includes('pinimg.com') && !src.includes('avatar') && !src.includes('profile')) {
                        // Tentar obter a versão original
                        src = src.replace(/\/\d+x\d*\//, '/originals/');
                        src = src.replace(/_\d+x\d*\./, '.');
                        if (!links.includes(src) && links.length < 30) {
                            links.push(src);
                        }
                    }
                });
                
                return links;
            });

            if (imageLinks.length > 5) {
                console.log(`✅ Pinterest: ${imageLinks.length} imagens encontradas`);
            } else {
                throw new Error('Poucas imagens no Pinterest');
            }

        } catch (pinterestError) {
            console.warn('⚠️ Pinterest falhou, usando fontes alternativas...');
            
            // Usar APIs de imagens gratuitas como fallback
            const unsplashQueries = [
                'anime couple',
                'manga couple',
                'cartoon couple',
                'illustrated couple',
                'romantic illustration'
            ];

            for (const query of unsplashQueries) {
                try {
                    const unsplashUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`;
                    imageLinks.push(unsplashUrl);
                } catch (e) {
                    console.warn('Unsplash query failed:', e.message);
                }
            }

            // Adicionar mais fontes de fallback
            imageLinks.push(...FALLBACK_IMAGES);
        }

        if (imageLinks.length > 0) {
            // Filtrar e validar URLs
            const validImages = imageLinks.filter(url => {
                try {
                    new URL(url);
                    return true;
                } catch {
                    return false;
                }
            });

            cachedImages = validImages.slice(0, 20); // Limitar a 20 imagens
            lastFetch = Date.now();
            console.log(`✅ Total: ${cachedImages.length} imagens válidas coletadas!`);
            return cachedImages;
        } else {
            throw new Error('Nenhuma imagem válida encontrada');
        }

    } catch (error) {
        console.error('❌ Erro ao buscar imagens:', error.message);
        console.log('🔄 Usando imagens de fallback...');
        return FALLBACK_IMAGES;
    } finally {
        if (page) await page.close().catch(() => {});
        if (context) await context.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
    }
}

// Função melhorada para download de imagem
async function downloadImage(url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`📥 Tentativa ${attempt}: Baixando imagem...`);
            
            // Primeiro, tentar com axios
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                },
                timeout: 10000,
                maxRedirects: 5,
                httpsAgent: new https.Agent({  
                    rejectUnauthorized: false
                })
            });

            if (response.data && response.data.byteLength > 1000) {
                console.log('✅ Imagem baixada com sucesso via Axios!');
                return Buffer.from(response.data);
            }
            
        } catch (axiosError) {
            console.warn(`⚠️ Axios falhou (tentativa ${attempt}):`, axiosError.message);
            
            // Fallback: usar Playwright para download
            try {
                const browser = await chromium.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--single-process'
                    ]
                });
                const context = await browser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                });
                const page = await context.newPage();

                const imageResponse = await page.goto(url, {
                    waitUntil: 'networkidle',
                    timeout: 8000
                });

                if (imageResponse && imageResponse.ok()) {
                    const buffer = await imageResponse.body();
                    await page.close();
                    await context.close();
                    await browser.close();

                    if (buffer && buffer.length > 1000) {
                        console.log('✅ Imagem baixada com sucesso via Playwright!');
                        return buffer;
                    }
                }

                await page.close();
                await context.close();
                await browser.close();

            } catch (playwrightError) {
                console.warn(`⚠️ Playwright também falhou (tentativa ${attempt}):`, playwrightError.message);
            }
        }
        
        // Aguardar antes da próxima tentativa
        if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    
    throw new Error('Todas as tentativas de download falharam');
}

async function shipCommand(sock, chatId, message, args) {
    try {
        let user1, user2;
        
        // Verificar menções
        const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const validMentions = mentions.filter(jid => jid && jid.endsWith('@s.whatsapp.net'));

        if (validMentions.length >= 2) {
            user1 = validMentions[0];
            user2 = validMentions[1];
        } else if (validMentions.length === 1) {
            user1 = message.key.participant || message.key.remoteJid;
            user2 = validMentions[0];
            if (user1 === user2) {
                return await sock.sendMessage(chatId, { 
                    text: '💔 *Oops!* Não pode shippar consigo mesmo! 😅\n\n💡 Marque outra pessoa ou deixe o bot escolher alguém do grupo!' 
                });
            }
        } else {
            // Ship aleatório no grupo
            try {
                const groupData = await sock.groupMetadata(chatId);
                const participants = groupData.participants
                    .map(p => p.id)
                    .filter(id => id.endsWith('@s.whatsapp.net'));
                
                if (participants.length < 2) {
                    return await sock.sendMessage(chatId, { 
                        text: '💔 *Grupo muito pequeno!*\n\nPreciso de pelo menos 2 pessoas para fazer um ship! 👥' 
                    });
                }
                
                user1 = participants[Math.floor(Math.random() * participants.length)];
                do {
                    user2 = participants[Math.floor(Math.random() * participants.length)];
                } while (user2 === user1);
                
            } catch (groupError) {
                return await sock.sendMessage(chatId, { 
                    text: '❌ *Erro:* Não foi possível acessar os dados do grupo!\n\nTente marcar duas pessoas: `.ship @user1 @user2`' 
                });
            }
        }

        // Buscar imagens
        console.log('🎨 Buscando imagem de anime ship...');
        const animeShipImages = await fetchAnimeShipImages();
        
        // Calcular compatibilidade
        const compatibility = Math.floor(Math.random() * 101);
        
        let status, emoji, description;
        if (compatibility >= 90) {
            status = 'ALMA GÊMEA! 💖✨';
            emoji = '🔥💕';
            description = 'Vocês nasceram um para o outro!';
        } else if (compatibility >= 70) {
            status = 'MUITO COMPATÍVEIS! 😍';
            emoji = '💕✨';
            description = 'Que química incrível!';
        } else if (compatibility >= 50) {
            status = 'BOA COMBINAÇÃO! 😌';
            emoji = '💛🌸';
            description = 'Podem dar muito certo juntos!';
        } else if (compatibility >= 30) {
            status = 'VALE TENTAR... 🤔';
            emoji = '😅💙';
            description = 'Quem sabe com um pouco de esforço...';
        } else {
            status = 'MELHOR COMO AMIGOS! 😬';
            emoji = '💔🤷‍♀️';
            description = 'A amizade é mais forte que o amor!';
        }

        // Selecionar imagem aleatória
        const randomImgUrl = animeShipImages[Math.floor(Math.random() * animeShipImages.length)];
        
        // Baixar imagem
        let imageBuffer;
        try {
            imageBuffer = await downloadImage(randomImgUrl);
        } catch (downloadError) {
            console.error('❌ Erro no download da imagem:', downloadError.message);
            
            // Enviar apenas texto se falhar o download da imagem
            const shipTextOnly = `💘 *ANIME SHIP* 💘

${emoji} @${user1.split('@')[0]} ❤️ @${user2.split('@')[0]}

📊 *${compatibility}%* - ${status}
💭 ${description}

🎨 *Imagem indisponível no momento* 📷❌`;

            return await sock.sendMessage(chatId, {
                text: shipTextOnly,
                mentions: [user1, user2]
            });
        }

        // Texto do ship
        const shipText = `💘 *ANIME SHIP* 💘

${emoji} @${user1.split('@')[0]} ❤️ @${user2.split('@')[0]}

📊 *${compatibility}%* - ${status}
💭 ${description}

✨ *Powered by Anime Magic!* 🎯`;

        // Enviar com imagem
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: shipText,
            mentions: [user1, user2]
        });

        console.log('✅ Ship enviado com sucesso!');

    } catch (error) {
        console.error('❌ Erro geral no comando ship:', error.message);
        
        await sock.sendMessage(chatId, {
            text: `❌ *Erro no Ship System*

💔 Algo deu errado, mas não desista do amor!

💡 *Como usar:*
• \`.ship\` - Ship aleatório no grupo
• \`.ship @user\` - Ship entre você e o usuário  
• \`.ship @user1 @user2\` - Ship específico

🔧 *Se o erro persistir, tente novamente em alguns minutos.*`
        });
    }
}

module.exports = shipCommand;