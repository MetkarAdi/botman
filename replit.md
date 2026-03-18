# Discord Bot

A feature-rich Discord bot built with Discord.js v14 and MongoDB.

## Project Overview

This is a pure backend Node.js application (no frontend/web UI). It connects to Discord and MongoDB on startup.

## Stack

- **Runtime**: Node.js 20
- **Framework**: Discord.js v14
- **Database**: MongoDB (via Mongoose)
- **Package Manager**: npm

## Required Secrets

| Secret | Description |
|--------|-------------|
| `BOT_TOKEN` | Discord bot token from Discord Developer Portal |
| `OWNER_ID` | Bot owner's Discord user ID |
| `MONGODB_URI` | MongoDB connection string (Atlas or local) |

## Project Structure

- `index.js` — Entry point; loads commands, slash commands, events, connects to DB, and logs in
- `commands/` — Text and slash command files organized by category
- `events/` — Discord event handlers
- `models/` — Mongoose schemas (Guild, Level, Warning, Giveaway, MafiaGame, etc.)
- `utils/` — Shared helpers (giveawayManager, mafiaPhases, helpers, etc.)

## Workflow

- **Start application** — runs `node index.js` (console output type)

## Fix Applied

The `models/giveaway.js` and `models/mafiaGame.js` files were renamed to `models/Giveaway.js` and `models/MafiaGame.js` to match the case-sensitive import paths used throughout the codebase on Linux.
