const PkmnCard = require('../models/PkmnCard');

const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2/en';
const GOD_PACK_CHANCE = 0.0005;
const CARDS_PER_PACK = 5;
const DEFAULT_RARITY_COLOR = '#95a5a6';
const DEFAULT_RARITY_WEIGHT = 2;

const PACKS = {
    charizard: createPack('Charizard Pack', 'A1', 'Charizard'),
    mewtwo: createPack('Mewtwo Pack', 'A1', 'Mewtwo'),
    pikachu: createPack('Pikachu Pack', 'A1', 'Pikachu'),
    dialga: createPack('Dialga Pack', 'A2', 'Dialga'),
    palkia: createPack('Palkia Pack', 'A2', 'Palkia'),
    solgaleo: createPack('Solgaleo Pack', 'A3', 'Solgaleo'),
    lunala: createPack('Lunala Pack', 'A3', 'Lunala'),
    'ho-oh': createPack('Ho-Oh Pack', 'A3a', 'Ho-Oh'),
    lugia: createPack('Lugia Pack', 'A3a', 'Lugia')
};

const RARITY_COLORS = {
    Common: '#95a5a6',
    Uncommon: '#2ecc71',
    Rare: '#3498db',
    'Rare Holo': '#9b59b6',
    'Double Rare': '#e67e22',
    'Illustration Rare': '#e91e8c',
    'Special Illustration Rare': '#e74c3c',
    'Hyper Rare': '#f1c40f'
};

const RARITY_WEIGHTS = {
    Common: 60,
    Uncommon: 25,
    Rare: 8,
    'Rare Holo': 4,
    'Double Rare': 1.5,
    'Illustration Rare': 0.8,
    'Special Illustration Rare': 0.15,
    'Hyper Rare': 0.05
};

async function fetchSetCards(setId) {
    const { default: fetch } = await import('node-fetch');
    const url = `${TCGDEX_API_BASE}/sets/${encodeURIComponent(setId)}/cards`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TCGdex request failed with status ${response.status}`);
        }

        const cards = await response.json();

        if (!Array.isArray(cards)) {
            throw new Error('TCGdex response was not an array');
        }

        return cards;
    } catch (error) {
        throw new Error(`Failed to fetch TCGdex set ${setId}: ${error.message}`);
    }
}

async function generatePack(packId, userId) {
    const normalizedPackId = String(packId || '').toLowerCase();
    const pack = PACKS[normalizedPackId];

    if (!pack) {
        throw new Error(`Unknown Pokemon pack: ${packId}`);
    }

    if (!userId) {
        throw new Error('userId is required');
    }

    const cardPool = await fetchSetCards(pack.setId);

    if (!cardPool.length) {
        throw new Error(`No cards found for TCGdex set ${pack.setId}`);
    }

    const cardsByRarity = groupCardsByRarity(cardPool);
    const highRarityCards = cardPool.filter((card) => !['Common', 'Uncommon'].includes(getCardRarity(card)));
    const isGodPack = Math.random() < GOD_PACK_CHANCE && highRarityCards.length > 0;
    const drawnCards = Array.from({ length: CARDS_PER_PACK }, () => (
        isGodPack
            ? randomItem(highRarityCards)
            : drawWeightedCard(cardsByRarity)
    ));

    const docs = drawnCards.map((card) => ({
        userId,
        cardId: generateCardId(),
        packId: normalizedPackId,
        setId: pack.setId,
        setName: card.set?.name || card.setName || pack.label,
        tcgdexId: card.id,
        localId: card.localId,
        name: card.name,
        rarity: getCardRarity(card),
        imageUrl: getImageUrl(card),
        drawnAt: new Date()
    }));

    const savedCards = await PkmnCard.insertMany(docs);

    return {
        cards: savedCards,
        isGodPack,
        pack
    };
}

function getRarityColor(rarity) {
    return RARITY_COLORS[rarity] || DEFAULT_RARITY_COLOR;
}

function groupCardsByRarity(cards) {
    return cards.reduce((groups, card) => {
        const rarity = getCardRarity(card);

        if (!groups.has(rarity)) {
            groups.set(rarity, []);
        }

        groups.get(rarity).push(card);
        return groups;
    }, new Map());
}

function drawWeightedCard(cardsByRarity) {
    const rarityEntries = [...cardsByRarity.entries()]
        .filter(([, cards]) => cards.length > 0)
        .map(([rarity, cards]) => ({
            rarity,
            cards,
            weight: RARITY_WEIGHTS[rarity] ?? DEFAULT_RARITY_WEIGHT
        }));

    const totalWeight = rarityEntries.reduce((total, entry) => total + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of rarityEntries) {
        roll -= entry.weight;

        if (roll <= 0) {
            return randomItem(entry.cards);
        }
    }

    return randomItem(rarityEntries[rarityEntries.length - 1].cards);
}

function createPack(label, setId, featuredPokemon) {
    return {
        label,
        setId,
        featuredPokemon,
        packArtUrl: `https://assets.tcgdex.net/en/${setId}/logo.png`
    };
}

function getCardRarity(card) {
    return card.rarity || 'Common';
}

function getImageUrl(card) {
    return card.image ? `${card.image}/high.webp` : null;
}

function generateCardId() {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

module.exports = {
    PACKS,
    RARITY_COLORS,
    getRarityColor,
    fetchSetCards,
    generatePack
};
