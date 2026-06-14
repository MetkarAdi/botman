/**
 * Logs bot activity status every 3 minutes.
 */
function startActivityPing(client) {
    setInterval(() => {
        const uptimeMs = client.uptime || 0;
        const hours = Math.floor(uptimeMs / 3600000);
        const minutes = Math.floor((uptimeMs % 3600000) / 60000);
        const seconds = Math.floor((uptimeMs % 60000) / 1000);
        const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

        const ping = Math.round(client.ws.ping);

        console.log(`[ActivityPing] Uptime: ${uptimeStr} | Ping: ${ping}ms`);
    }, 3 * 60 * 1000); // every 3 minutes

    console.log('Activity ping logger started.');
}

module.exports = startActivityPing;
