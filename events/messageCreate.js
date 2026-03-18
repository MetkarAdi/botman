const Guild = require('../models/Guild');
const Level = require('../models/Level');
const Cooldown = require('../models/Cooldown');
const AccessList = require('../models/AccessList');
const Afk = require('../models/Afk');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignore bots and webhooks
        if (message.author.bot || message.webhookId) return;

        // Ignore DMs
        if (!message.guild) return;

        // Check if user is blacklisted (global check)
        try {
            const blacklistCheck = await AccessList.findOne({ userId: message.author.id, type: 'blacklist' });
            if (blacklistCheck) return;
        } catch (error) {
            console.error('Error checking blacklist:', error);
        }

        // Get guild settings
        let guildData;
        try {
            guildData = await Guild.findOne({ guildId: message.guild.id });
            if (!guildData) {
                guildData = new Guild({ guildId: message.guild.id, prefix: client.config.defaultPrefix });
                await guildData.save();
            }
        } catch (error) {
            console.error('Error fetching guild data:', error);
            return;
        }

        const prefix = guildData.prefix || client.config.defaultPrefix;

        // ── AFK System ─────────────────────────────────────────────────────────

        // If the sender is AFK and they say something, remove their AFK status
        if (!message.content.startsWith(prefix)) {
            try {
                const authorAfk = await Afk.findOne({ userId: message.author.id, guildId: message.guild.id });
                if (authorAfk) {
                    await Afk.deleteOne({ userId: message.author.id, guildId: message.guild.id });

                    // Remove [AFK] from nickname if present
                    try {
                        const member = message.member;
                        if (member.nickname?.startsWith('[AFK] ')) {
                            await member.setNickname(member.nickname.replace('[AFK] ', ''));
                        }
                    } catch { /* No permissions — fine */ }

                    const afkDuration = Math.floor((Date.now() - authorAfk.timestamp) / 1000);
                    message.reply({ content: `👋 Welcome back! Your AFK status has been removed. (Away for <t:${Math.floor(authorAfk.timestamp.getTime() / 1000)}:R>)`, allowedMentions: { repliedUser: false } })
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 6000));
                }
            } catch (err) {
                console.error('AFK removal error:', err);
            }
        }

        // Check if any mentioned users are AFK
        if (message.mentions.users.size > 0) {
            for (const [, user] of message.mentions.users) {
                if (user.id === message.author.id) continue;
                try {
                    const afkData = await Afk.findOne({ userId: user.id, guildId: message.guild.id });
                    if (afkData) {
                        message.reply({
                            content: `💤 **${user.username}** is AFK: ${afkData.reason} — <t:${Math.floor(afkData.timestamp.getTime() / 1000)}:R>`,
                            allowedMentions: { repliedUser: false }
                        }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
                    }
                } catch (err) {
                    console.error('AFK mention check error:', err);
                }
            }
        }

        // ── Levelling ──────────────────────────────────────────────────────────
        if (guildData.levellingEnabled) {
            await handleLevelling(message, guildData);
        }

        // ── Commands ───────────────────────────────────────────────────────────
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName) ||
            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        if (command.ownerOnly && message.author.id !== client.config.ownerId) {
            return message.reply('❌ This command is restricted to the bot owner.');
        }

        if (command.guildOnly && !message.guild) {
            return message.reply('❌ This command can only be used in a server.');
        }

        if (command.category === 'moderation' || command.category === 'snipe') {
            const whitelistCheck = await AccessList.findOne({ userId: message.author.id, type: 'whitelist' });
            const hasModPerms = message.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                               message.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
                               message.member.permissions.has(PermissionFlagsBits.Administrator) ||
                               message.member.permissions.has(PermissionFlagsBits.KickMembers) ||
                               message.member.permissions.has(PermissionFlagsBits.BanMembers);

            if (!whitelistCheck && !hasModPerms) {
                return message.reply('❌ You need to be a moderator or whitelisted to use this command.');
            }
        }

        if (command.permissions) {
            const authorMember = message.guild.members.cache.get(message.author.id);
            if (!authorMember.permissions.has(command.permissions)) {
                return message.reply(`❌ You need the following permissions: ${command.permissions.join(', ')}`);
            }
        }

        if (command.botPermissions) {
            const botMember = message.guild.members.cache.get(client.user.id);
            if (!botMember.permissions.has(command.botPermissions)) {
                return message.reply(`❌ I need the following permissions: ${command.botPermissions.join(', ')}`);
            }
        }

        if (!client.cooldowns.has(command.name)) {
            client.cooldowns.set(command.name, new Map());
        }

        const now = Date.now();
        const timestamps = client.cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply(`⏳ Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.name}\` again.`);
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

        try {
            await command.execute(message, args, client, guildData);
        } catch (error) {
            console.error(`Error executing command ${command.name}:`, error);
            message.reply('❌ There was an error executing that command!');
        }
    }
};

// Levelling system handler
async function handleLevelling(message, guildData) {
    if (guildData.ignoredChannels.includes(message.channel.id)) return;
    const member = message.member;
    if (member && member.roles.cache.some(role => guildData.ignoredRoles.includes(role.id))) return;

    try {
        let cooldown = await Cooldown.findOne({ userId: message.author.id, guildId: message.guild.id });
        if (!cooldown) {
            cooldown = new Cooldown({ userId: message.author.id, guildId: message.guild.id, messageCount: 0 });
        }

        cooldown.messageCount += 1;
        await cooldown.save();

        if (cooldown.messageCount >= 5) {
            cooldown.messageCount = 0;
            await cooldown.save();

            let levelData = await Level.findOne({ userId: message.author.id, guildId: message.guild.id });
            if (!levelData) {
                levelData = new Level({ userId: message.author.id, guildId: message.guild.id, xp: 0, level: 1, messages: 0 });
            }

            const baseXP = Math.floor(Math.random() * 11) + 15;
            const xpGain = Math.floor(baseXP * (guildData.xpMultiplier || 1));
            levelData.xp += xpGain;
            levelData.messages += 5;
            levelData.lastMessage = new Date();

            const requiredXP = calculateRequiredXP(levelData.level);
            if (levelData.xp >= requiredXP) {
                levelData.level += 1;
                levelData.xp = levelData.xp - requiredXP;

                const levelUpChannel = guildData.levelUpChannel
                    ? message.guild.channels.cache.get(guildData.levelUpChannel)
                    : message.channel;

                if (levelUpChannel) {
                    levelUpChannel.send({ content: `🎉 Congratulations ${message.author}! You leveled up to **Level ${levelData.level}**!` }).catch(() => {});
                }
            }

            await levelData.save();
        }
    } catch (error) {
        console.error('Error in levelling system:', error);
    }
}

function calculateRequiredXP(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}