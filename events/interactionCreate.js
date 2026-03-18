const Guild = require('../models/Guild');
const mafiaInteraction = require('./mafiaInteraction');
const AccessList = require('../models/AccessList');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            // Check if user is blacklisted
            try {
                const blacklistCheck = await AccessList.findOne({ userId: interaction.user.id, type: 'blacklist' });
                if (blacklistCheck) {
                    return interaction.reply({
                        content: '❌ You have been blacklisted from using this bot.',
                        ephemeral: true
                    });
                }
            } catch (error) {
                console.error('Error checking blacklist:', error);
            }

            // Get guild settings
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
                    console.error('Error fetching guild data:', error);
                }
            }

            // Check if command is owner-only
            if (command.ownerOnly && interaction.user.id !== client.config.ownerId) {
                return interaction.reply({
                    content: '❌ This command is restricted to the bot owner.',
                    ephemeral: true
                });
            }

            // Check for moderation commands - require whitelist or mod permissions
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

            // Check user permissions
            if (command.permissions && interaction.member) {
                if (!interaction.member.permissions.has(command.permissions)) {
                    return interaction.reply({
                        content: `❌ You need the following permissions: ${command.permissions.join(', ')}`,
                        ephemeral: true
                    });
                }
            }

            // Check bot permissions
            if (command.botPermissions && interaction.guild) {
                const botMember = interaction.guild.members.cache.get(client.user.id);
                if (!botMember.permissions.has(command.botPermissions)) {
                    return interaction.reply({
                        content: `❌ I need the following permissions: ${command.botPermissions.join(', ')}`,
                        ephemeral: true
                    });
                }
            }

            // Execute command
            try {
                await command.execute(interaction, client, guildData);
            } catch (error) {
                console.error(`Error executing slash command ${interaction.commandName}:`, error);
                const errorMessage = '❌ There was an error executing that command!';

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        }

        // Handle button interactions — delegate mafia ones
        else if (interaction.isButton()) {
            if (interaction.customId.startsWith('mafia_')) {
                return mafiaInteraction.execute(interaction, client);
            }
        }

        // Handle select menu interactions — delegate mafia ones
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('mafia_') || interaction.customId.startsWith('mhelp_')) {
                return mafiaInteraction.execute(interaction, client);
            }
        }

        // Handle modal submissions
        else if (interaction.isModalSubmit()) {
            // Handle modal submissions here if needed
        }
    }
};