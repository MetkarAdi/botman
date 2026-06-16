const { createCanvas, loadImage } = require('@napi-rs/canvas');

const WIDTH = 300;
const HEIGHT = 420;

const RARITY_COLORS = {
    Basic: '#aaaaaa',
    Common: '#2ecc71',
    Rare: '#3498db',
    Epic: '#9b59b6',
    Legendary: '#f1c40f'
};

const RARITY_EMOJIS = {
    Basic: '⚪',
    Common: '⭐',
    Rare: '⭐',
    Epic: '⭐',
    Legendary: '⭐'
};

async function fetchImage(url) {
    if (!url) return null;

    try {
        const { default: fetch } = await import('node-fetch');
        const response = await fetch(url);

        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        return loadImage(Buffer.from(arrayBuffer));
    } catch (error) {
        return null;
    }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function truncateText(text, maxLength) {
    const value = String(text || '');
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function statValue(value) {
    return value === undefined || value === null ? 0 : value;
}

function drawCenteredText(ctx, text, y, font, color) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, WIDTH / 2, y);
}

function drawImagePlaceholder(ctx, x, y, width, height) {
    ctx.fillStyle = '#555555';
    ctx.fillRect(x, y, width, height);
}

async function generateCard(playerData) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    const rarity = playerData.rarity || 'Basic';
    const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.Basic;
    const rarityEmoji = RARITY_EMOJIS[rarity] || RARITY_EMOJIS.Basic;
    const stats = playerData.stats || {};

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    drawRoundedRect(ctx, 4, 4, WIDTH - 8, HEIGHT - 8, 14);
    ctx.strokeStyle = rarityColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = rarityColor;
    ctx.fillRect(0, 0, WIDTH, 40);
    ctx.restore();

    drawCenteredText(ctx, `${rarityEmoji} ${rarity}`, 20, 'bold 16px Arial', '#ffffff');

    const playerImage = await fetchImage(playerData.playerPhoto);
    if (playerImage) {
        ctx.drawImage(playerImage, 50, 45, 200, 200);
    } else {
        drawImagePlaceholder(ctx, 50, 45, 200, 200);
    }

    const clubImage = await fetchImage(playerData.clubLogo);
    if (clubImage) {
        ctx.drawImage(clubImage, 255, 45, 35, 35);
    }

    drawCenteredText(
        ctx,
        truncateText(playerData.playerName, 22),
        260,
        'bold 18px Arial',
        '#ffffff'
    );

    drawCenteredText(
        ctx,
        `${playerData.position || ''} · ${playerData.club || ''}`,
        282,
        '13px Arial',
        '#aaaaaa'
    );

    const statItems = [
        ['Goals', statValue(stats.goals)],
        ['Assists', statValue(stats.assists)],
        ['Appearances', statValue(stats.appearances)],
        ['Rating', statValue(playerData.rating)],
        ['Key Passes', statValue(stats.keyPasses)],
        ['Dribbles', statValue(stats.dribbles)],
        ['Yellow Cards', statValue(stats.yellowCards)],
        ['Red Cards', statValue(stats.redCards)]
    ];

    statItems.forEach(([label, value], index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const centerX = column === 0 ? 85 : 215;
        const labelY = 308 + row * 24;
        const valueY = labelY + 13;

        drawCenteredText(ctx, label, labelY, '11px Arial', '#aaaaaa');
        drawCenteredText(ctx, String(value), valueY, 'bold 13px Arial', '#ffffff');
    });

    drawCenteredText(ctx, `#${playerData.cardId || ''}`, 412, '10px Arial', '#aaaaaa');

    return canvas.toBuffer('image/png');
}

module.exports = generateCard;
