const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const axios = require('axios');
const { truncate } = require('../../utils/helpers');

module.exports = {
    name: 'define',
    aliases: ['dictionary', 'dict', 'def'],
    description: 'Look up a word definition using the Free Dictionary API',
    usage: 'define <word>',
    category: 'api',
    cooldown: 5,

    async execute(message, args, client) {
        if (!args[0]) return message.reply('❌ Provide a word. E.g. `>>define ephemeral`');

        const word = args.join(' ').toLowerCase().trim();
        const loading = await message.reply(`🔍 Looking up **${word}**...`);

        try {
            const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            const entries = res.data;

            if (!entries?.length) return loading.edit(`❌ No definition found for **${word}**.`);

            const entry = entries[0];
            const phonetic = entry.phonetics?.find(p => p.text)?.text || '';
            const audioUrl = entry.phonetics?.find(p => p.audio)?.audio || null;

            // Group all meanings by part of speech, paginate
            const meanings = entry.meanings || [];
            let page = 0;

            const buildEmbed = (pageIndex) => {
                const meaning = meanings[pageIndex];
                const embed = new EmbedBuilder()
                    .setTitle(`📖 ${entry.word}${phonetic ? `  •  ${phonetic}` : ''}`)
                    .setColor('#4A90D9')
                    .setFooter({ text: `Free Dictionary API • Definition ${pageIndex + 1}/${meanings.length}` })
                    .setTimestamp();

                embed.addFields({ name: '📝 Part of Speech', value: meaning.partOfSpeech, inline: true });

                const defs = meaning.definitions.slice(0, 3);
                defs.forEach((d, i) => {
                    embed.addFields({ name: `Definition ${i + 1}`, value: truncate(d.definition, 1024), inline: false });
                    if (d.example) embed.addFields({ name: '💬 Example', value: `*"${truncate(d.example, 512)}"*`, inline: false });
                });

                const synonyms = meaning.synonyms?.slice(0, 8);
                const antonyms = meaning.antonyms?.slice(0, 8);
                if (synonyms?.length) embed.addFields({ name: '🟢 Synonyms', value: synonyms.join(', '), inline: true });
                if (antonyms?.length) embed.addFields({ name: '🔴 Antonyms', value: antonyms.join(', '), inline: true });

                if (audioUrl) embed.addFields({ name: '🔊 Pronunciation', value: `[Listen](${audioUrl})`, inline: true });

                return embed;
            };

            const buildRow = (pageIndex) => {
                if (meanings.length <= 1) return null;
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('def_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 0),
                    new ButtonBuilder().setCustomId('def_next').setLabel('Next ▶').setStyle(ButtonStyle.Primary).setDisabled(pageIndex === meanings.length - 1)
                );
            };

            const row = buildRow(page);
            const reply = await loading.edit({
                content: null,
                embeds: [buildEmbed(page)],
                components: row ? [row] : []
            });

            if (meanings.length <= 1) return;

            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: i => i.user.id === message.author.id,
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.customId === 'def_prev') page = Math.max(0, page - 1);
                if (i.customId === 'def_next') page = Math.min(meanings.length - 1, page + 1);
                await i.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
            });

            collector.on('end', () => {
                reply.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            if (error.response?.status === 404) {
                return loading.edit(`❌ No definition found for **${word}**. Check your spelling.`);
            }
            console.error('Dictionary API error:', error.message);
            loading.edit('❌ Failed to fetch definition. Try again later.');
        }
    }
};