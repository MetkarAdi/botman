const { EmbedBuilder } = require('discord.js');
const Giveaway = require('../models/Giveaway');
const { checkRequirements, buildEmbed, buildRow } = require('../utils/giveawayManager');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('giveaway_enter_')) return;

        const giveawayId = interaction.customId.replace('giveaway_enter_', '');

        let giveaway;
        try {
            giveaway = await Giveaway.findById(giveawayId);
        } catch {
            return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
        }

        if (!giveaway || giveaway.ended || giveaway.cancelled) {
            return interaction.reply({ content: '❌ This giveaway is no longer active.', ephemeral: true });
        }

        // Check requirements
        const member = interaction.member || await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member) return interaction.reply({ content: '❌ Could not verify your membership.', ephemeral: true });

        const failures = await checkRequirements(giveaway, member);
        if (failures.length > 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ You don\'t meet the requirements')
                .setDescription(failures.join('\n'))
                .setColor('#FF4444');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Toggle entry
        const alreadyEntered = giveaway.entries.includes(interaction.user.id);
        if (alreadyEntered) {
            // Remove entry (leave giveaway)
            giveaway.entries = giveaway.entries.filter(id => id !== interaction.user.id);
            await giveaway.save();

            // Update embed entry count
            try {
                await interaction.message.edit({
                    embeds: [buildEmbed(giveaway, interaction.guild)],
                    components: [buildRow(giveaway)]
                });
            } catch {}

            return interaction.reply({ content: '👋 You have **left** this giveaway.', ephemeral: true });
        } else {
            // Add entry
            giveaway.entries.push(interaction.user.id);
            await giveaway.save();

            // Update embed entry count
            try {
                await interaction.message.edit({
                    embeds: [buildEmbed(giveaway, interaction.guild)],
                    components: [buildRow(giveaway)]
                });
            } catch {}

            return interaction.reply({ content: `🎉 You have entered the giveaway for **${giveaway.prize}**! Click the button again to leave.`, ephemeral: true });
        }
    }
};