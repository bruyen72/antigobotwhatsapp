const insults = [
    "Você é como uma nuvem. Quando desaparece, é um belo dia!",
    "Você traz muita alegria para todos quando sai da sala!",
    "Eu concordaria com você, mas então ambos estaríamos errados.",
    "Você não é burro; só tem azar de pensar.",
    "Seus segredos estão sempre seguros comigo. Nunca os escuto.",
    "Você é a prova de que até a evolução tira férias às vezes.",
    "Você tem algo no queixo... não, o terceiro lá embaixo.",
    "Você é como uma atualização de software. Sempre que te vejo, penso: 'Preciso disso agora?'",
    "Você traz felicidade para todos... sabe, quando vai embora.",
    "Você é como uma moeda—duas caras e não vale muito.",
    "Você tem algo na mente... ah, esquece.",
    "Você é o motivo de colocarem instruções nos frascos de xampu.",
    "Você é como uma nuvem. Sempre flutuando sem propósito real.",
    "Suas piadas são como leite vencido—azedas e difíceis de digerir.",
    "Você é como uma vela no vento... inútil quando as coisas ficam difíceis.",
    "Você tem algo único—sua habilidade de irritar todos igualmente.",
    "Você é como um sinal de Wi-Fi—sempre fraco quando mais precisa.",
    "Você é a prova de que nem todos precisam de filtro para ser desagradável.",
    "Sua energia é como um buraco negro—só suga a vida do ambiente.",
    "Você tem o rosto perfeito para rádio.",
    "Você é como um engarrafamento—ninguém te quer, mas aí está você.",
    "Você é como um lápis quebrado—sem ponta.",
    "Suas ideias são tão originais, tenho certeza que já ouvi todas antes.",
    "Você é prova viva de que até erros podem ser produtivos.",
    "Você não é preguiçoso; é apenas altamente motivado a não fazer nada.",
    "Seu cérebro roda Windows 95—lento e ultrapassado.",
    "Você é como uma lombada—ninguém gosta, mas todos têm que lidar.",
    "Você é como uma nuvem de mosquitos—só irritante.",
    "Você une as pessoas... para falarem como você é chato."
];

async function insultCommand(sock, chatId, message) {
    try {
        if (!message || !chatId) {
            console.log('Invalid message or chatId:', { message, chatId });
            return;
        }

        let userToInsult;
        
        // Check for mentioned users
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToInsult = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToInsult = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToInsult) {
            await sock.sendMessage(chatId, {
                text: 'Por favor mencione alguém ou responda a mensagem dela para insultá-la!'
            });
            return;
        }

        const insult = insults[Math.floor(Math.random() * insults.length)];

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.sendMessage(chatId, { 
            text: `Hey @${userToInsult.split('@')[0]}, ${insult}`,
            mentions: [userToInsult]
        });
    } catch (error) {
        console.error('Error in insult command:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: 'Por favor tente novamente em alguns segundos.'
                });
            } catch (retryError) {
                console.error('Error sending retry message:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: 'Ocorreu um erro ao enviar o insulto.'
                });
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }
}

module.exports = { insultCommand };
