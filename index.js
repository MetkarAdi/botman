require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

// Connect to MongoDB
async function connectDatabase() {
    try {
        await mongoose.connect(client.config.mongodbUri);
        console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
}

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
            const command = require(filePath);

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
        const command = require(filePath);

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

    await connectDatabase();
    loadCommands();
    loadSlashCommands();
    loadEvents();

    // Login to Discord
    await client.login(client.config.token);
}

// Handle unhandled errors
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// Start the bot
init();