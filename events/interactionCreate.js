const Guild = require('../models/Guild');
const mafiaInteraction = require('./mafiaInteraction');
const AccessList = require('../models/AccessList');
const { PermissionFlagsBits } = require('discord.js');
const { logError } = require('../utils/errorLogger');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                const blacklistCheck = await AccessList.findOne({ userId: interaction.user.id, type: 'blacklist' });
                if (blacklistCheck) {
                    return interaction.reply({
                        content: '❌ You have been blacklisted from using this bot.',
                        ephemeral: true
                    });
                }
            } catch (error) {
                await logError(client, error, `interactionCreate — ${interaction.commandName}`);
            }

            let guildData = null;
            if (interaction.guild) {
                try {
                    guildData = await Guild.findOne({ guildId: interaction.guild.id });
                    if (!guildData) {
                        guildData = new Guild({
                            guildId: interaction.guild.id,
                            prefix: client.config.defaultPrefix
                        });
                        await guildData.save();
                    }
                } catch (error) {
                    await logError(client, error, `interactionCreate — ${interaction.commandName}`);
                }
            }

            if (command.ownerOnly && interaction.user.id !== client.config.ownerId) {
                return interaction.reply({
                    content: '❌ This command is restricted to the bot owner.',
                    ephemeral: true
                });
            }

            if (command.category === 'moderation' || command.category === 'snipe') {
                const whitelistCheck = await AccessList.findOne({ userId: interaction.user.id, type: 'whitelist' });
                const hasModPerms = interaction.member?.permissions?.has(PermissionFlagsBits.ModerateMembers) ||
                    interaction.member?.permissions?.has(PermissionFlagsBits.ManageMessages) ||
                    interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
                    interaction.member?.permissions?.has(PermissionFlagsBits.KickMembers) ||
                    interaction.member?.permissions?.has(PermissionFlagsBits.BanMembers);

                if (!whitelistCheck && !hasModPerms) {
                    return interaction.reply({
                        content: '❌ You need to be a moderator or whitelisted to use this command.',
                        ephemeral: true
                    });
                }
            }

            if (command.permissions && interaction.member) {
                if (!interaction.member.permissions.has(command.permissions)) {
                    return interaction.reply({
                        content: `❌ You need the following permissions: ${command.permissions.join(', ')}`,
                        ephemeral: true
                    });
                }
            }

            if (command.botPermissions && interaction.guild) {
                const botMember = interaction.guild.members.cache.get(client.user.id);
                if (!botMember.permissions.has(command.botPermissions)) {
                    return interaction.reply({
                        content: `❌ I need the following permissions: ${command.botPermissions.join(', ')}`,
                        ephemeral: true
                    });
                }
            }

            try {
                await command.execute(interaction, client, guildData);
            } catch (error) {
                await logError(client, error, `interactionCreate — ${interaction.commandName}`);
                const errorMessage = '❌ An error occurred while running that command.';

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        } else if (interaction.isButton()) {
            try {
                if (interaction.customId.startsWith('mafia_')) {
                    return await mafiaInteraction.execute(interaction, client);
                }

                if (interaction.customId.startsWith('giveaway_')) {
                    return await require('./giveawayInteraction').execute(interaction, client);
                }
            } catch (error) {
                await logError(client, error, `interactionCreate — ${interaction.customId}`);
            }
        } else if (interaction.isStringSelectMenu()) {
            try {
                if (interaction.customId.startsWith('mafia_') || interaction.customId.startsWith('mhelp_')) {
                    return await mafiaInteraction.execute(interaction, client);
                }
            } catch (error) {
                await logError(client, error, `interactionCreate — ${interaction.customId}`);
            }
        }
    }
};
