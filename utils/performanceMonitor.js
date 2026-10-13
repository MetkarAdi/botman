const { monitorEventLoopDelay } = require('node:perf_hooks');
const { logPerformance } = require('./errorLogger');

function startPerformanceMonitor(client, intervalMs = 60_000) {
    const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
    eventLoopDelay.enable();

    let previousCpu = process.cpuUsage();
    let previousTime = process.hrtime.bigint();
    const timer = setInterval(async () => {
        const now = process.hrtime.bigint();
        const elapsedUs = Number(now - previousTime) / 1_000;
        const cpu = process.cpuUsage(previousCpu);
        const cpuPercent = elapsedUs > 0
            ? ((cpu.user + cpu.system) / elapsedUs) * 100
            : 0;
        const memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
        const eventLoopP99Ms = eventLoopDelay.percentile(99) / 1e6;

        previousCpu = process.cpuUsage();
        previousTime = now;
        eventLoopDelay.reset();

        await logPerformance(client, { cpuPercent, memoryMb, eventLoopP99Ms });
    }, intervalMs);

    timer.unref();
    console.log('[Performance] Monitor started; reports are sent every minute.');
}

module.exports = { startPerformanceMonitor };
