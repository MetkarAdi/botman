const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'settings',
    aliases: ['config', 'setup'],
    description: 'View or change server settings',
    usage: 'settings [setting] [value]',
    category: 'settings',
    guildOnly: true,
    permissions: ['ManageGuild'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const setting = args[0]?.toLowerCase();
        const value = args.slice(1).join(' ');

        // If no setting specified, show current settings
        if (!setting) {
            const embed = new EmbedBuilder()
                .setTitle(`⚙️ Settings - ${message.guild.name}`)
                .setDescription('Current server settings:')
                .setColor('#00FFFF')
                .addFields(
                    { name: 'Prefix', value: `\`${guildData.prefix}\``, inline: true },
                    { name: 'Levelling', value: guildData.levellingEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Moderation', value: guildData.moderationEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'XP Multiplier', value: `${guildData.xpMultiplier}x`, inline: true },
                    { name: 'Log Channel', value: guildData.logChannel ? `<#${guildData.logChannel}>` : 'Not set', inline: true },
                    { name: 'Welcome Channel', value: guildData.welcomeChannel ? `<#${guildData.welcomeChannel}>` : 'Not set', inline: true },
                    { name: 'Goodbye Channel', value: guildData.goodbyeChannel ? `<#${guildData.goodbyeChannel}>` : 'Not set', inline: true },
                    { name: 'Level Up Channel', value: guildData.levelUpChannel ? `<#${guildData.levelUpChannel}>` : 'Current channel', inline: true },
                    { name: 'Auto Role', value: guildData.autoRole ? `<@&${guildData.autoRole}>` : 'Not set', inline: true }
                )
                .setFooter({ text: `Use ${guildData.prefix}settings <setting> <value> to change settings` })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // Handle different settings
        switch (setting) {
            case 'prefix':
                if (!value) {
                    return message.reply(`Current prefix: \`${guildData.prefix}\``);
                }
                if (value.length > 5) {
                    return message.reply('❌ Prefix cannot be longer than 5 characters.');
                }
                guildData.prefix = value;
                await guildData.save();
                message.reply(`✅ Prefix has been changed to \`${value}\``);
                break;

            case 'logchannel':
            case 'log': {
                const logChannel = message.mentions.channels.first();
                if (!logChannel && value !== 'none') {
                    return message.reply('❌ Please mention a channel or use "none" to disable.');
                }
                guildData.logChannel = logChannel ? logChannel.id : null;
                await guildData.save();
                message.reply(logChannel
                    ? `✅ Log channel set to ${logChannel}`
                    : '✅ Log channel has been disabled.');
                break;
            }

            case 'welcomechannel':
            case 'welcome': {
                const welcomeChannel = message.mentions.channels.first();
                if (!welcomeChannel && value !== 'none') {
                    return message.reply('❌ Please mention a channel or use "none" to disable.');
                }
                guildData.welcomeChannel = welcomeChannel ? welcomeChannel.id : null;
                await guildData.save();
                message.reply(welcomeChannel
                    ? `✅ Welcome channel set to ${welcomeChannel}`
                    : '✅ Welcome channel has been disabled.');
                break;
            }

            case 'welcomemessage':
            case 'welcomemsg':
                if (!value) {
                    return message.reply(`Current welcome message: \`${guildData.welcomeMessage}\``);
                }
                guildData.welcomeMessage = value;
                await guildData.save();
                message.reply(`✅ Welcome message has been updated.`);
                break;

            case 'goodbyechannel':
            case 'goodbye': {
                const goodbyeChannel = message.mentions.channels.first();
                if (!goodbyeChannel && value !== 'none') {
                    return message.reply('❌ Please mention a channel or use "none" to disable.');
                }
                guildData.goodbyeChannel = goodbyeChannel ? goodbyeChannel.id : null;
                await guildData.save();
                message.reply(goodbyeChannel
                    ? `✅ Goodbye channel set to ${goodbyeChannel}`
                    : '✅ Goodbye channel has been disabled.');
                break;
            }

            case 'goodbyemessage':
            case 'goodbyemsg':
                if (!value) {
                    return message.reply(`Current goodbye message: \`${guildData.goodbyeMessage}\``);
                }
                guildData.goodbyeMessage = value;
                await guildData.save();
                message.reply(`✅ Goodbye message has been updated.`);
                break;

            case 'levelupchannel':
            case 'levelchannel': {
                const levelChannel = message.mentions.channels.first();
                if (!levelChannel && value !== 'none') {
                    return message.reply('❌ Please mention a channel or use "none" for current channel.');
                }
                guildData.levelUpChannel = levelChannel ? levelChannel.id : null;
                await guildData.save();
                message.reply(levelChannel
                    ? `✅ Level up channel set to ${levelChannel}`
                    : '✅ Level up messages will be sent in the current channel.');
                break;
            }

            case 'autorole': {
                const autoRole = message.mentions.roles.first();
                if (!autoRole && value !== 'none') {
                    return message.reply('❌ Please mention a role or use "none" to disable.');
                }
                guildData.autoRole = autoRole ? autoRole.id : null;
                await guildData.save();
                message.reply(autoRole
                    ? `✅ Auto role set to ${autoRole}`
                    : '✅ Auto role has been disabled.');
                break;
            }

            case 'xpmultiplier':
            case 'xpmult': {
                const multiplier = parseFloat(value);
                if (isNaN(multiplier) || multiplier < 0.1 || multiplier > 10) {
                    return message.reply('❌ Please provide a valid multiplier between 0.1 and 10.');
                }
                guildData.xpMultiplier = multiplier;
                await guildData.save();
                message.reply(`✅ XP multiplier has been set to ${multiplier}x`);
                break;
            }

            default:
                message.reply(`❌ Unknown setting. Available settings: prefix, logchannel, welcomechannel, welcomemessage, goodbyechannel, goodbyemessage, levelupchannel, autorole, xpmultiplier`);
        }
    }
};
