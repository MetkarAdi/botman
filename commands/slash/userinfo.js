const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../info/userinfo');
module.exports = {
    data: new SlashCommandBuilder().setName('userinfo').setDescription(cmd.description)
        .addStringOption(o => o.setName('user').setDescription('User mention, username, nickname, or ID')),
    category: 'info',
    async execute(interaction, client, guildData) {
        await interaction.deferReply();
        const query = interaction.options.getString('user')?.trim();
        const mentionId = query?.match(/^<@!?(\d+)>$/)?.[1];
        const mentionedMember = mentionId ? interaction.guild?.members.cache.get(mentionId) : null;
        const m = {
            reply: o => interaction.editReply(o),
            author: interaction.user,
            guild: interaction.guild,
            member: interaction.member,
            mentions: {
                members: { first: () => mentionedMember || null },
                users: { first: () => mentionedMember?.user || null }
            }
        };

        await cmd.execute(m, query ? [query] : [], client, guildData);
    }
};
