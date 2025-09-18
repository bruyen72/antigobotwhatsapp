async function shipCommand(sock, chatId, msg, groupMetadata) {
    try {
        // Get all participants from the group
        const groupMetadata = await sock.groupMetadata(chatId);
        const ps = groupMetadata.participants.map(v => v.id);
        
        // Check if there are at least 2 participants
        if (ps.length < 2) {
            await sock.sendMessage(chatId, { text: '💔 *Erro no ship!*\\n\\n👥 *Preciso de pelo menos 2 pessoas no grupo*\\n\\n💡 *Dica:* Adicione mais pessoas ao grupo\\n\\n✨ *Yen-Bot* - Criando casais! 🌸' });
            return;
        }
        
        // Get two random participants
        let firstUser, secondUser;
        
        // Select first random user
        firstUser = ps[Math.floor(Math.random() * ps.length)];
        
        // Select second random user (different from first)
        do {
            secondUser = ps[Math.floor(Math.random() * ps.length)];
        } while (secondUser === firstUser);

        // Format the mentions
        const formatMention = id => '@' + id.split('@')[0];

        // Calculate compatibility percentage
        const compatibility = Math.floor(Math.random() * 101); // 0-100%
        let compatibilityEmoji = '';
        let compatibilityText = '';

        if (compatibility >= 90) {
            compatibilityEmoji = '🔥💖';
            compatibilityText = 'PERFEITO! Almas gêmeas!';
        } else if (compatibility >= 70) {
            compatibilityEmoji = '💕✨';
            compatibilityText = 'Muito compatíveis!';
        } else if (compatibility >= 50) {
            compatibilityEmoji = '💛🌸';
            compatibilityText = 'Boa química!';
        } else if (compatibility >= 30) {
            compatibilityEmoji = '😅👍';
            compatibilityText = 'Podem tentar...';
        } else {
            compatibilityEmoji = '😅💔';
            compatibilityText = 'Melhor como amigos!';
        }

        // Create and send the ship message with kawaii styling
        await sock.sendMessage(chatId, {
            text: `💘 *SHIP KAWAII* 💘\n\n💑 ${formatMention(firstUser)} ❤️ ${formatMention(secondUser)}\n\n📊 *Compatibilidade:* ${compatibility}% ${compatibilityEmoji}\n🎆 *Resultado:* ${compatibilityText}\n\n🎉 *Parabéns pelo match!*\n\n✨ *Yen-Bot* - Cupido digital! 🌸`,
            mentions: [firstUser, secondUser]
        });

    } catch (error) {
        console.error('Error in ship command:', error);
        await sock.sendMessage(chatId, { text: '💔 *Erro no ship!*\n\n⚠️ *Este comando só funciona em grupos*\n👥 *Preciso de pelo menos 2 pessoas*\n\n💡 *Dica:* Use em um grupo ativo\n\n✨ *Yen-Bot* - Criando casais! 🌸' });
    }
}

module.exports = shipCommand; 