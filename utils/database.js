const mongoose = require('mongoose');

const INITIAL_DELAY_MS = 2_000;
const MAX_DELAY_MS = 60_000;
const JITTER_MS = 1_000;

/**
 * Keeps MongoDB available without taking the Discord client down during a
 * transient Atlas, DNS, or network interruption.
 */
function createDatabaseManager(uri, { onError = console.error, onStatus = console.log } = {}) {
    let reconnectTimer = null;
    let reconnecting = false;
    let closing = false;
    let attempts = 0;

    const options = {
        serverSelectionTimeoutMS: 15_000,
        connectTimeoutMS: 15_000,
        socketTimeoutMS: 45_000,
        heartbeatFrequencyMS: 10_000,
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 60_000,
        retryReads: true,
        retryWrites: true
    };

    const delayFor = () => Math.min(
        INITIAL_DELAY_MS * (2 ** Math.min(attempts, 5)) + Math.floor(Math.random() * JITTER_MS),
        MAX_DELAY_MS
    );

    async function connect() {
        if (closing || reconnecting || mongoose.connection.readyState === 1) return;

        reconnecting = true;
        try {
            await mongoose.connect(uri, options);
            attempts = 0;
            onStatus('[MongoDB] Connected');
        } catch (error) {
            attempts += 1;
            onError(error, 'MongoDB connection');
            scheduleReconnect();
        } finally {
            reconnecting = false;
        }
    }

    function scheduleReconnect() {
        if (closing || reconnectTimer || mongoose.connection.readyState === 1) return;

        const delay = delayFor();
        onStatus(`[MongoDB] Reconnecting in ${Math.ceil(delay / 1000)}s (attempt ${attempts || 1})`);
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, delay);
    }

    mongoose.connection.on('connected', () => {
        attempts = 0;
        onStatus('[MongoDB] Connection ready');
    });
    mongoose.connection.on('reconnected', () => onStatus('[MongoDB] Reconnected'));
    mongoose.connection.on('disconnected', () => {
        if (!closing) {
            onStatus('[MongoDB] Disconnected; keeping the bot online while reconnecting');
            scheduleReconnect();
        }
    });
    mongoose.connection.on('error', error => onError(error, 'MongoDB runtime'));

    return {
        connect,
        async close() {
            closing = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = null;
            await mongoose.disconnect();
        }
    };
}

module.exports = { createDatabaseManager };
