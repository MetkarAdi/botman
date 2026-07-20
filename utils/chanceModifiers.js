const ChanceModifier = require('../models/ChanceModifier');

const MAX_CHANCE_LEVEL = 25;

async function getChanceLevel(userId) {
    const modifier = await ChanceModifier.findOne({ userId }).lean();
    const level = Number(modifier?.level);

    return Number.isFinite(level)
        ? Math.min(Math.max(Math.floor(level), 0), MAX_CHANCE_LEVEL)
        : 0;
}

module.exports = {
    MAX_CHANCE_LEVEL,
    getChanceLevel
};
