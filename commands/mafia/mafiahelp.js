const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ROLES } = require('../../utils/mafiaRoles');

const ROLE_PAGES = Object.entries(ROLES).map(([key, role]) => ({ key, ...role }));

module.exports = {
    name: 'mafiahelp',
    aliases: ['mhelp', 'mafia-help'],
    description: 'View all Mafia roles and game mechanics',
    usage: 'mafiahelp',
    category: 'mafia',
    cooldown: 5,

    async execute(message, args, client) {
        let page = 0;

        const buildEmbed = (i) => {
            const role = ROLE_PAGES[i];
            const teamColors = { village: '#00AA00', mafia: '#FF0000', neutral: '#9B59B6' };
            const teamLabels = { village: '🟢 Village', mafia: '🔴 Mafia', neutral: '⚪ Neutral' };

            return new EmbedBuilder()
                .setTitle(`${role.emoji} ${role.name}`)
                .setColor(role.color || teamColors[role.team])
                .addFields(
                    { name: '👥 Team', value: teamLabels[role.team], inline: true },
                    { name: '🏆 Goal', value: role.goal, inline: false },
                    { name: '⚔️ Ability', value: role.ability, inline: false },
                    { name: '📖 Description', value: role.description, inline: false }
                )
                .setFooter({ text: `Role ${i + 1}/${ROLE_PAGES.length} • Use the buttons to browse` });
        };

        const buildRow = (i) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mhelp_first').setLabel('⏮').setStyle(ButtonStyle.Secondary).setDisabled(i === 0),
            new ButtonBuilder().setCustomId('mhelp_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(i === 0),
            new ButtonBuilder().setCustomId('mhelp_next').setLabel('▶').setStyle(ButtonStyle.Primary).setDisabled(i === ROLE_PAGES.length - 1),
            new ButtonBuilder().setCustomId('mhelp_last').setLabel('⏭').setStyle(ButtonStyle.Secondary).setDisabled(i === ROLE_PAGES.length - 1)
        );

        const reply = await message.reply({ embeds: [buildEmbed(page)], components: [buildRow(page)] });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000
        });

        collector.on('collect', async i => {
            if (i.customId === 'mhelp_first') page = 0;
            else if (i.customId === 'mhelp_prev') page = Math.max(0, page - 1);
            else if (i.customId === 'mhelp_next') page = Math.min(ROLE_PAGES.length - 1, page + 1);
            else if (i.customId === 'mhelp_last') page = ROLE_PAGES.length - 1;
            await i.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
        });

        collector.on('end', () => reply.edit({ components: [] }).catch(() => {}));
    }
};