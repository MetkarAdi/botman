# Discord Bot

A feature-rich Discord bot with levelling, moderation, logging, and info systems built with Discord.js v14 and MongoDB.

## Features

### Levelling System
- XP gained every 5 messages (random 15-25 XP)
- Customizable XP multiplier per server
- Level-up announcements
- Leaderboard and rank commands
- Toggle on/off (Owner only)

### Moderation System
- **User Management**: Kick, Ban, Unban, Timeout, Untimeout
- **Role Management**: Create, Delete, Give, Take roles
- **Warning System**: Warn, Delete warning, List warnings, Clear all warnings
- Toggle on/off (Owner only)
- Whitelist system for non-moderators

### Logging System
- Message delete/edit logs
- Member join/leave logs
- Voice channel join/leave/move logs
- Ban/unban logs
- Role create/delete logs
- Channel create/delete logs
- Configurable per log type (Admin only)

### Info Commands
- **User Info**: Works for users NOT in the server too! Shows badges, roles, permissions, level stats
- **Server Info**: Detailed server statistics, features, boosts

### Utility Commands
- **Snipe**: View deleted messages (Mod/Whitelist only)
- **Poll**: Create reaction polls
- **Avatar**: Get any user's avatar
- **Ping**: Check bot latency
- **Help**: Command list and detailed info

### Fun Commands
- 8-Ball, Coinflip, Dice Roll

### Settings
- Customizable prefix per server
- Welcome/Goodbye messages with variables
- Auto-role on join
- Level-up channel configuration

### Security
- **Blacklist**: Block users from using the bot entirely (Owner only)
- **Whitelist**: Allow specific users to use moderation commands (Owner only)
- Blacklist overrides all permissions (even admins)

## Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/) database (free tier on MongoDB Atlas works fine)
- A Discord Bot Token

### Step 1: Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab on the left
4. Click "Add Bot"
5. Under "Privileged Gateway Intents", enable:
   - **MESSAGE CONTENT INTENT** (Required for text commands)
   - **SERVER MEMBERS INTENT** (Required for member info)
   - **PRESENCE INTENT** (Required for presence info)
6. Click "Reset Token" and copy your bot token (keep it secret!)
7. Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Administrator` (recommended) or manually select required permissions
   - Copy and open the generated URL to invite the bot

### Step 2: Set Up MongoDB

**Option A: MongoDB Atlas (Cloud - Recommended)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password

**Option B: Local MongoDB**
1. Install MongoDB locally
2. Connection URI will be: `mongodb://localhost:27017/discordbot`

### Step 3: Configure the Bot

1. Rename `.env.example` to `.env`
2. Fill in the following values:

```env
# Discord Bot Token (from Discord Developer Portal)
BOT_TOKEN=YOUR_BOT_TOKEN_HERE

# Your Discord User ID (Enable Developer Mode in Discord, right-click your profile, Copy User ID)
OWNER_ID=YOUR_USER_ID_HERE

# MongoDB Connection URI
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/discordbot?retryWrites=true&w=majority

# Default Prefix (can be changed per server)
DEFAULT_PREFIX=>>
```

### Step 4: Install and Run

```bash
# Install dependencies
npm install

# Start the bot
npm start

# Or for development with auto-restart
npm run dev
```

## Required Tokens/URIs

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `BOT_TOKEN` | Your bot's authentication token | Discord Developer Portal → Bot → Reset Token |
| `OWNER_ID` | Your Discord user ID | Discord → Settings → Advanced → Developer Mode → Right-click your profile → Copy User ID |
| `MONGODB_URI` | MongoDB connection string | MongoDB Atlas or local MongoDB |

## Commands

### Owner Commands (Bot Owner Only)
| Command | Description |
|---------|-------------|
| `>>togglelevelling` | Toggle levelling system on/off |
| `>>togglemoderation` | Toggle moderation system on/off |
| `>>whitelist [@user]` | Whitelist a user for mod commands |
| `>>unwhitelist [@user]` | Remove user from whitelist |
| `>>blacklist [@user]` | Blacklist a user from bot |
| `>>unblacklist [@user]` | Remove user from blacklist |
| `>>eval <code>` | Execute JavaScript code |

### Moderation Commands (Mods/Admins/Whitelisted)
| Command | Description |
|---------|-------------|
| `>>kick @user [reason]` | Kick a user |
| `>>ban @user [reason]` | Ban a user |
| `>>unban <user_id>` | Unban a user |
| `>>timeout @user <duration> [reason]` | Timeout a user (e.g., 1h, 30m, 1d) |
| `>>untimeout @user` | Remove timeout |
| `>>warn @user <reason>` | Warn a user |
| `>>warnings [@user]` | List user's warnings |
| `>>delwarn <warning_id>` | Delete a specific warning |
| `>>clearwarnings @user` | Clear all warnings for a user |
| `>>createrole <name> [color] [hoist]` | Create a role |
| `>>deleterole @role` | Delete a role |
| `>>giverole @user @role` | Give a role to a user |
| `>>takerole @user @role` | Remove a role from a user |
| `>>snipe` | View last deleted message |

### Levelling Commands
| Command | Description |
|---------|-------------|
| `>>rank [@user]` | Check your or another user's rank |
| `>>leaderboard [page]` | View server leaderboard |

### Info Commands
| Command | Description |
|---------|-------------|
| `>>userinfo [@user or user_id]` | Get user info (works for non-members too!) |
| `>>serverinfo` | Get server info |

### Settings Commands (Manage Server Permission)
| Command | Description |
|---------|-------------|
| `>>settings` | View current settings |
| `>>prefix [new_prefix]` | View or change server prefix |
| `>>settings welcomechannel #channel` | Set welcome channel |
| `>>settings welcomemessage <message>` | Set welcome message |
| `>>settings goodbyechannel #channel` | Set goodbye channel |
| `>>settings goodbyemessage <message>` | Set goodbye message |
| `>>settings levelupchannel #channel` | Set level-up channel |
| `>>settings autorole @role` | Set auto-role |
| `>>settings xpmultiplier <number>` | Set XP multiplier |

### Admin Commands (Administrator Permission)
| Command | Description |
|---------|-------------|
| `>>logsetup` | View logging configuration |
| `>>logsetup enable/disable` | Enable/disable logging |
| `>>logsetup channel #channel` | Set log channel |
| `>>logsetup messagedelete on/off` | Toggle message delete logs |
| `>>logsetup messageedit on/off` | Toggle message edit logs |
| `>>logsetup memberjoin on/off` | Toggle member join logs |
| `>>logsetup memberleave on/off` | Toggle member leave logs |
| `>>logsetup voicejoin on/off` | Toggle voice join logs |
| `>>logsetup voiceleave on/off` | Toggle voice leave logs |
| `>>logsetup voicemove on/off` | Toggle voice move logs |
| `>>logsetup modactions on/off` | Toggle mod action logs |

### Utility Commands
| Command | Description |
|---------|-------------|
| `>>help [command]` | Show help |
| `>>ping` | Check bot latency |
| `>>avatar [@user or user_id]` | Get user's avatar |
| `>>poll Question \| Option1 \| Option2` | Create a poll |

### Fun Commands
| Command | Description |
|---------|-------------|
| `>>8ball <question>` | Ask the magic 8-ball |
| `>>coinflip` | Flip a coin |
| `>>roll [sides]` | Roll a dice |

## Welcome/Goodbye Message Variables

Use these variables in your welcome/goodbye messages:
- `{user}` - Mentions the user
- `{username}` - User's username
- `{server}` - Server name
- `{membercount}` - Total member count

Example: `Welcome {user} to {server}! You are member #{membercount}!`

## Slash Commands

All commands are also available as slash commands! Simply type `/` in Discord to see the available commands.

## Permissions

| Command Category | Required Permission |
|------------------|---------------------|
| Owner Commands | Bot Owner Only |
| Moderation | ModerateMembers / ManageMessages / KickMembers / BanMembers / Administrator OR Whitelisted |
| Settings | ManageGuild |
| Log Setup | Administrator |
| Info/Utility/Fun | None |

## Troubleshooting

### Bot doesn't respond to commands
- Check if the bot has `Read Messages` and `Send Messages` permissions
- Verify the prefix is correct (`>>` by default)
- Check console for errors

### Message content intent error
- Enable "MESSAGE CONTENT INTENT" in Discord Developer Portal → Bot → Privileged Gateway Intents

### MongoDB connection error
- Verify your MongoDB URI is correct
- Check if your IP is whitelisted in MongoDB Atlas

### Bot shows offline
- Check if BOT_TOKEN is correct in .env
- Restart the bot

## License

MIT License - Feel free to use and modify!

## Support

For issues or questions, check the console logs for error messages and ensure all prerequisites are met.
