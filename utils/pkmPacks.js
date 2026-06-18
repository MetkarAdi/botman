const PkmnCard = require('../models/PkmnCard');

const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2/en';
const GOD_PACK_CHANCE = 0.0005;
const CARDS_PER_PACK = 5;
const DEFAULT_RARITY_COLOR = '#95a5a6';
const DEFAULT_RARITY_WEIGHT = 2;

const TCGDEX_SETS = {
    'A1-genetic-apex': createSet('A1', 'Genetic Apex'),
    'A1a-mythical-island': createSet('A1a', 'Mythical Island'),
    'A2-space-time-smackdown': createSet('A2', 'Space-Time Smackdown'),
    'A2a-triumphant-light': createSet('A2a', 'Triumphant Light'),
    'A3-celestial-guardians': createSet('A3', 'Celestial Guardians'),
    'A3a-extradimensional-crisis': createSet('A3a', 'Extradimensional Crisis'),
    'A4-wisdom-of-sea-and-sky': createSet('A4', 'Wisdom of Sea and Sky')
};

const PACK_TO_SET = {
    charizard: 'A1-genetic-apex',
    mewtwo: 'A1-genetic-apex',
    pikachu: 'A1-genetic-apex',
    dialga: 'A2-space-time-smackdown',
    palkia: 'A2-space-time-smackdown',
    solgaleo: 'A3-celestial-guardians',
    lunala: 'A3-celestial-guardians',
    'ho-oh': 'A4-wisdom-of-sea-and-sky',
    lugia: 'A4-wisdom-of-sea-and-sky'
};

const PACKS = {
    charizard: createPack('charizard', 'Charizard Pack', 'Charizard'),
    mewtwo: createPack('mewtwo', 'Mewtwo Pack', 'Mewtwo'),
    pikachu: createPack('pikachu', 'Pikachu Pack', 'Pikachu'),
    dialga: createPack('dialga', 'Dialga Pack', 'Dialga'),
    palkia: createPack('palkia', 'Palkia Pack', 'Palkia'),
    solgaleo: createPack('solgaleo', 'Solgaleo Pack', 'Solgaleo'),
    lunala: createPack('lunala', 'Lunala Pack', 'Lunala'),
    'ho-oh': createPack('ho-oh', 'Ho-Oh Pack', 'Ho-Oh'),
    lugia: createPack('lugia', 'Lugia Pack', 'Lugia')
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
    const set = resolveTcgdexSet(setId);
    const url = `${TCGDEX_API_BASE}/sets/${encodeURIComponent(set.tcgdexSetId)}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TCGdex request failed with status ${response.status}`);
        }

        const data = await response.json();
        const cards = data.cards;

        if (!Array.isArray(cards)) {
            throw new Error('TCGdex response did not include a cards array');
        }

        return cards.map((card) => ({
            ...card,
            setId,
            tcgdexSetId: data.id || set.tcgdexSetId,
            setName: data.name || set.setName
        }));
    } catch (error) {
        throw new Error(`Failed to fetch TCGdex set ${setId} (API id ${set.tcgdexSetId}): ${error.message}`);
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
        setName: card.setName || pack.setName,
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

function createSet(tcgdexSetId, setName) {
    return {
        tcgdexSetId,
        setName,
        packArtUrl: `https://assets.tcgdex.net/en/tcgp/${tcgdexSetId}/logo`
    };
}

function createPack(packId, label, featuredPokemon) {
    const setKey = PACK_TO_SET[packId];
    const set = TCGDEX_SETS[setKey];

    return {
        label,
        setId: setKey,
        tcgdexSetId: set.tcgdexSetId,
        setName: set.setName,
        featuredPokemon,
        packArtUrl: set.packArtUrl
    };
}

function resolveTcgdexSet(setId) {
    const normalizedSetId = String(setId || '').trim();
    const mappedSet = TCGDEX_SETS[normalizedSetId];

    if (mappedSet) {
        return mappedSet;
    }

    const setFromApiId = Object.values(TCGDEX_SETS)
        .find((set) => set.tcgdexSetId.toLowerCase() === normalizedSetId.toLowerCase());

    if (setFromApiId) {
        return setFromApiId;
    }

    throw new Error(`Unknown TCGdex Pokemon TCG Pocket set: ${setId}`);
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
    PACK_TO_SET,
    TCGDEX_SETS,
    RARITY_COLORS,
    getRarityColor,
    fetchSetCards,
    generatePack
};
