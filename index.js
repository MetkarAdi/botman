require('dotenv').config();
const keepAlive = require('./keepalive');
const { Client, GatewayIntentBits, Collection, Partials, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logError, logCritical } = require('./utils/errorLogger');
const { createDatabaseManager } = require('./utils/database');
const { installModernUi } = require('./utils/ui');

// Create client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction]
});

// Collections for commands
client.commands = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Collection();

// Configuration from environment
client.config = {
    token: process.env.BOT_TOKEN,
    ownerId: process.env.OWNER_ID,
    defaultPrefix: process.env.DEFAULT_PREFIX || '>>',
    mongodbUri: process.env.MONGODB_URI
};

installModernUi();

// Validate required environment variables
if (!client.config.token) {
    console.error('❌ BOT_TOKEN is required in .env file');
    process.exit(1);
}

if (!client.config.ownerId) {
    console.error('❌ OWNER_ID is required in .env file');
    process.exit(1);
}

if (!client.config.mongodbUri) {
    console.error('❌ MONGODB_URI is required in .env file');
    process.exit(1);
}

const database = createDatabaseManager(client.config.mongodbUri, {
    onError: (error, context) => logError(client, error, context),
    onStatus: message => console.log(message)
});

client.rest.on('rateLimited', data => {
    logError(client, new Error(`Rate limited on ${data.route} for ${data.timeToReset}ms`), 'REST RateLimit');
});

// Load text commands
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        if (folder === 'slash') continue; // slash commands are loaded separately
        const folderPath = path.join(commandsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            let command;
            try {
                command = require(filePath);
            } catch (error) {
                console.warn(`⚠️ Skipping command at ${filePath}:`, error.message);
                continue;
            }

            if ('name' in command && 'execute' in command) {
                client.commands.set(command.name, command);
                console.log(`✅ Loaded command: ${command.name}`);
            } else {
                console.log(`⚠️ Command at ${filePath} is missing required properties`);
            }
        }
    }
}

// Load slash commands
function loadSlashCommands() {
    const slashCommandsPath = path.join(__dirname, 'commands', 'slash');
    if (!fs.existsSync(slashCommandsPath)) return;

    const slashFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));

    for (const file of slashFiles) {
        const filePath = path.join(slashCommandsPath, file);
        let command;
        try {
            command = require(filePath);
        } catch (error) {
            console.warn(`⚠️ Skipping slash command at ${filePath}:`, error.message);
            continue;
        }

        if ('data' in command && 'execute' in command) {
            client.slashCommands.set(command.data.name, command);
            console.log(`✅ Loaded slash command: ${command.data.name}`);
        } else {
            console.log(`⚠️ Slash command at ${filePath} is missing required properties`);
        }
    }
    console.log(`\n📋 Total slash commands loaded: ${client.slashCommands.size}`);
}

// Load event handlers
function loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    if (!fs.existsSync(eventsPath)) return;

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        console.log(`✅ Loaded event: ${event.name}`);
    }
}

// Initialize bot
async function init() {
    console.log('🚀 Starting Discord Bot...\n');
    keepAlive();

    await database.connect();
    loadCommands();
    loadSlashCommands();
    loadEvents();

    // Login to Discord
    try {
        await client.login(client.config.token);
        setTimeout(() => {
            if (!client.isReady()) {
                logCritical(client, new Error('Client did not become ready within 30 seconds'), 'Ready Timeout');
            }
        }, 30 * 1000);
    } catch (error) {
        await logCritical(client, error, 'Bot Login');
        throw error;
    }
}

// Handle unhandled errors
process.on('unhandledRejection', error => logCritical(client, error, 'unhandledRejection'));

process.on('uncaughtException', error => logCritical(client, error, 'uncaughtException'));

client.on('error', error => logCritical(client, error, 'Discord Client'));

async function shutdown(signal) {
    console.log(`\n[Shutdown] ${signal} received; closing cleanly...`);
    await database.close();
    client.destroy();
    process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Start the bot
init();
