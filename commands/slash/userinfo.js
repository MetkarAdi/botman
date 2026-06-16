const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../info/userinfo');
module.exports = {
    data: new SlashCommandBuilder().setName('userinfo').setDescription(cmd.description)
        .addUserOption(o => o.setName('user').setDescription('The user to look up').setRequired(false)),
    category: 'info',
    async execute(interaction, client, guildData) {
        await interaction.deferReply();
        const user = interaction.options.getUser('user');
        const targetMember = user
            ? await interaction.guild.members.fetch(user.id).catch(() => null)
            : interaction.member;

        const m = {
            reply: o => interaction.editReply(o),
            author: interaction.user,
            guild: interaction.guild,
            member: targetMember,
            mentions: {
                members: { first: () => targetMember || null },
                users: { first: () => user || targetMember?.user || null }
            }
        };

        await cmd.execute(m, user ? [user.id] : [], client, guildData);
    }
};
