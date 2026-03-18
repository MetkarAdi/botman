const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const LogConfig = require('../../models/LogConfig');

module.exports = {
    name: 'logsetup',
    aliases: ['logconfig', 'logging'],
    description: 'Configure the logging system (Admin Only)',
    usage: 'logsetup <action> [value]',
    category: 'settings',
    guildOnly: true,
    permissions: ['Administrator'],
    cooldown: 5,

    async execute(message, args, client) {
        if (!args[0]) {
            // Show current config
            let logConfig = await LogConfig.findOne({ guildId: message.guild.id });
            if (!logConfig) {
                logConfig = new LogConfig({ guildId: message.guild.id });
                await logConfig.save();
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Logging Configuration')
                .setDescription('Current logging settings:')
                .setColor('#00FFFF')
                .addFields(
                    { name: 'Status', value: logConfig.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Log Channel', value: logConfig.logChannel ? `<#${logConfig.logChannel}>` : 'Not set', inline: true },
                    { name: '\u200B', value: '\u200B', inline: true },
                    { name: 'Message Logs', value: `Delete: ${logConfig.messageDelete ? '✅' : '❌'}\nEdit: ${logConfig.messageEdit ? '✅' : '❌'}`, inline: true },
                    { name: 'Member Logs', value: `Join: ${logConfig.memberJoin ? '✅' : '❌'}\nLeave: ${logConfig.memberLeave ? '✅' : '❌'}`, inline: true },
                    { name: 'Voice Logs', value: `Join: ${logConfig.voiceJoin ? '✅' : '❌'}\nLeave: ${logConfig.voiceLeave ? '✅' : '❌'}\nMove: ${logConfig.voiceMove ? '✅' : '❌'}`, inline: true },
                    { name: 'Mod Logs', value: logConfig.modActions ? '✅' : '❌', inline: true },
                    { name: 'Ban Logs', value: `Add: ${logConfig.banAdd ? '✅' : '❌'}\nRemove: ${logConfig.banRemove ? '✅' : '❌'}`, inline: true },
                    { name: 'Role Logs', value: `Create: ${logConfig.roleCreate ? '✅' : '❌'}\nDelete: ${logConfig.roleDelete ? '✅' : '❌'}`, inline: true },
                    { name: 'Channel Logs', value: `Create: ${logConfig.channelCreate ? '✅' : '❌'}\nDelete: ${logConfig.channelDelete ? '✅' : '❌'}`, inline: true }
                )
                .setFooter({ text: `Use ${client.config.defaultPrefix}logsetup <action> [value] to change settings` })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const action = args[0].toLowerCase();
        const value = args[1]?.toLowerCase();

        let logConfig = await LogConfig.findOne({ guildId: message.guild.id });
        if (!logConfig) {
            logConfig = new LogConfig({ guildId: message.guild.id });
        }

        switch (action) {
            case 'enable':
                logConfig.enabled = true;
                await logConfig.save();
                message.reply('✅ Logging system has been **enabled**.');
                break;

            case 'disable':
                logConfig.enabled = false;
                await logConfig.save();
                message.reply('✅ Logging system has been **disabled**.');
                break;

            case 'channel': {
                const channel = message.mentions.channels.first();
                if (!channel && value !== 'none') {
                    return message.reply('❌ Please mention a channel or use "none" to remove.');
                }
                logConfig.logChannel = channel ? channel.id : null;
                await logConfig.save();
                message.reply(channel
                    ? `✅ Log channel set to ${channel}`
                    : '✅ Log channel has been removed.');
                break;
            }

            case 'messagedelete':
            case 'msgdel':
                logConfig.messageDelete = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Message delete logging ${logConfig.messageDelete ? 'enabled' : 'disabled'}.`);
                break;

            case 'messageedit':
            case 'msgedit':
                logConfig.messageEdit = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Message edit logging ${logConfig.messageEdit ? 'enabled' : 'disabled'}.`);
                break;

            case 'memberjoin':
            case 'join':
                logConfig.memberJoin = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Member join logging ${logConfig.memberJoin ? 'enabled' : 'disabled'}.`);
                break;

            case 'memberleave':
            case 'leave':
                logConfig.memberLeave = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Member leave logging ${logConfig.memberLeave ? 'enabled' : 'disabled'}.`);
                break;

            case 'voicejoin':
            case 'vcjoin':
                logConfig.voiceJoin = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Voice join logging ${logConfig.voiceJoin ? 'enabled' : 'disabled'}.`);
                break;

            case 'voiceleave':
            case 'vcleave':
                logConfig.voiceLeave = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Voice leave logging ${logConfig.voiceLeave ? 'enabled' : 'disabled'}.`);
                break;

            case 'voicemove':
            case 'vcmove':
                logConfig.voiceMove = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Voice move logging ${logConfig.voiceMove ? 'enabled' : 'disabled'}.`);
                break;

            case 'modactions':
            case 'mod':
                logConfig.modActions = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Moderation action logging ${logConfig.modActions ? 'enabled' : 'disabled'}.`);
                break;

            case 'banadd':
                logConfig.banAdd = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Ban add logging ${logConfig.banAdd ? 'enabled' : 'disabled'}.`);
                break;

            case 'banremove':
            case 'unban':
                logConfig.banRemove = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Ban remove logging ${logConfig.banRemove ? 'enabled' : 'disabled'}.`);
                break;

            case 'rolecreate':
                logConfig.roleCreate = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Role create logging ${logConfig.roleCreate ? 'enabled' : 'disabled'}.`);
                break;

            case 'roledelete':
                logConfig.roleDelete = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Role delete logging ${logConfig.roleDelete ? 'enabled' : 'disabled'}.`);
                break;

            case 'channelcreate':
                logConfig.channelCreate = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Channel create logging ${logConfig.channelCreate ? 'enabled' : 'disabled'}.`);
                break;

            case 'channeldelete':
                logConfig.channelDelete = value === 'on' || value === 'true' || value === 'enable';
                await logConfig.save();
                message.reply(`✅ Channel delete logging ${logConfig.channelDelete ? 'enabled' : 'disabled'}.`);
                break;

            default:
                message.reply('❌ Unknown action. Available actions: `enable`, `disable`, `channel`, `messagedelete`, `messageedit`, `memberjoin`, `memberleave`, `voicejoin`, `voiceleave`, `voicemove`, `modactions`, `banadd`, `banremove`, `rolecreate`, `roledelete`, `channelcreate`, `channeldelete`');
        }
    }
};
