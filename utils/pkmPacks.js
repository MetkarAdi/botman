const PkmnCard = require('../models/PkmnCard');
const { getChanceLevel } = require('./chanceModifiers');

const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2/en';
const GOD_PACK_CHANCE = 0.001;
const GOD_PACK_CHANCE_PER_LEVEL = 0.0035;
const MAX_GOD_PACK_CHANCE = 0.15;
const CARDS_PER_PACK = 5;
const DEFAULT_RARITY_COLOR = '#95a5a6';
const DEFAULT_RARITY_WEIGHT = 2;
const DETAIL_FETCH_CONCURRENCY = 12;

const setCardCache = new Map();
const pocketSetCache = { loadedAt: 0, sets: null };

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
    'One Diamond': '#95a5a6',
    'Two Diamond': '#2ecc71',
    'Three Diamond': '#3498db',
    'Four Diamond': '#9b59b6',
    'One Star': '#e67e22',
    'Two Star': '#e91e8c',
    'Three Star': '#e74c3c',
    'One Shiny': '#1abc9c',
    'Two Shiny': '#16a085',
    Crown: '#f1c40f',
    None: '#7f8c8d'
};

const RARITY_WEIGHTS = {
    'One Diamond': 60,
    'Two Diamond': 25,
    'Three Diamond': 8,
    'Four Diamond': 4,
    'One Star': 1.5,
    'Two Star': 0.8,
    'Three Star': 0.15,
    'One Shiny': 0.3,
    'Two Shiny': 0.12,
    Crown: 0.05,
    None: 2
};

async function fetchSetCards(setId) {
    const normalizedSetId = String(setId || '').trim();

    if (setCardCache.has(normalizedSetId)) {
        return setCardCache.get(normalizedSetId);
    }

    const { default: fetch } = await import('node-fetch');
    const set = resolveTcgdexSet(normalizedSetId);
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

        const detailedCards = await mapWithConcurrency(cards, DETAIL_FETCH_CONCURRENCY, async (card) => {
            const detail = await fetchCardDetail(card.id, fetch);

            return {
                ...card,
                ...detail,
                setId: normalizedSetId,
                tcgdexSetId: data.id || set.tcgdexSetId,
                setName: data.name || set.setName
            };
        });

        setCardCache.set(normalizedSetId, detailedCards);
        return detailedCards;
    } catch (error) {
        throw new Error(`Failed to fetch TCGdex set ${normalizedSetId} (API id ${set.tcgdexSetId}): ${error.message}`);
    }
}

async function searchPocketCards(query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();

    if (!normalizedQuery) {
        return [];
    }

    const sets = await fetchPocketSets();
    const summariesBySet = await mapWithConcurrency(sets, 4, async (set) => {
        const summaries = await fetchSetSummaries(set.id);

        return summaries
            .filter((card) => card.name?.toLowerCase().includes(normalizedQuery) || card.id?.toLowerCase() === normalizedQuery)
            .map((card) => ({
                ...card,
                setId: set.id,
                tcgdexSetId: set.tcgdexSetId,
                setName: set.name
            }));
    });
    const matches = summariesBySet.flat();
    const { default: fetch } = await import('node-fetch');
    const details = await mapWithConcurrency(matches, DETAIL_FETCH_CONCURRENCY, async (card) => {
        const detail = await fetchCardDetail(card.id, fetch);

        return {
            ...card,
            ...detail,
            setId: card.setId,
            tcgdexSetId: card.tcgdexSetId,
            setName: card.setName
        };
    });

    return details.sort(comparePocketCards);
}

async function fetchPocketSets() {
    if (pocketSetCache.sets) {
        return pocketSetCache.sets;
    }

    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`${TCGDEX_API_BASE}/series/tcgp`);

    if (!response.ok) {
        throw new Error(`Failed to fetch TCGdex Pocket series with status ${response.status}`);
    }

    const data = await response.json();
    const sets = Array.isArray(data.sets) ? data.sets : [];

    pocketSetCache.sets = sets.map((set) => ({
        id: set.id,
        tcgdexSetId: set.id,
        name: set.name
    }));

    return pocketSetCache.sets;
}

async function fetchSetSummaries(setId) {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`${TCGDEX_API_BASE}/sets/${encodeURIComponent(setId)}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch TCGdex set ${setId} with status ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.cards) ? data.cards : [];
}

async function fetchCardDetail(cardId, fetch) {
    const response = await fetch(`${TCGDEX_API_BASE}/cards/${encodeURIComponent(cardId)}`);

    if (!response.ok) {
        throw new Error(`TCGdex card ${cardId} failed with status ${response.status}`);
    }

    return response.json();
}

async function mapWithConcurrency(items, limit, mapper) {
    const results = [];
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const currentIndex = index;
            index += 1;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

function comparePocketCards(a, b) {
    if ((a.tcgdexSetId || a.setId) !== (b.tcgdexSetId || b.setId)) {
        return String(a.tcgdexSetId || a.setId).localeCompare(String(b.tcgdexSetId || b.setId), undefined, { numeric: true });
    }

    return String(a.localId || '').localeCompare(String(b.localId || ''), undefined, { numeric: true });
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

    const chanceLevel = await getChanceLevel(userId);
    const cardsByRarity = groupCardsByRarity(cardPool);
    const highRarityCards = cardPool.filter((card) => !['One Diamond', 'Two Diamond'].includes(getCardRarity(card)));
    const isGodPack = Math.random() < getGodPackChance(chanceLevel) && highRarityCards.length > 0;
    const guaranteedPremiumCards = getGuaranteedPremiumCardCount(chanceLevel);
    const premiumCards = cardPool.filter(card => getRarityTier(getCardRarity(card)) >= 3);
    const premiumCardsByRarity = groupCardsByRarity(premiumCards);
    const drawnCards = Array.from({ length: CARDS_PER_PACK }, (_, index) => {
        if (isGodPack) return randomItem(highRarityCards);
        if (index < guaranteedPremiumCards && premiumCards.length > 0) return drawWeightedCard(premiumCardsByRarity, chanceLevel);
        return drawWeightedCard(cardsByRarity, chanceLevel);
    });

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

function drawWeightedCard(cardsByRarity, chanceLevel = 0) {
    const rarityEntries = [...cardsByRarity.entries()]
        .filter(([, cards]) => cards.length > 0)
        .map(([rarity, cards]) => ({
            rarity,
            cards,
            weight: getRarityWeight(rarity, chanceLevel)
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

function getGuaranteedPremiumCardCount(chanceLevel) {
    if (chanceLevel >= 20) return 2;
    if (chanceLevel >= 10) return 1;
    return 0;
}

function getRarityTier(rarity) {
    return {
        'One Diamond': 0, 'Two Diamond': 1, 'Three Diamond': 2, 'Four Diamond': 3,
        'One Star': 4, 'Two Star': 5, 'Three Star': 6, 'One Shiny': 5,
        'Two Shiny': 6, Crown: 7
    }[rarity] ?? 0;
}
function getGodPackChance(chanceLevel) {
    return Math.min(
        GOD_PACK_CHANCE + (chanceLevel * GOD_PACK_CHANCE_PER_LEVEL),
        MAX_GOD_PACK_CHANCE
    );
}

function getRarityWeight(rarity, chanceLevel) {
    const baseWeight = RARITY_WEIGHTS[rarity] ?? DEFAULT_RARITY_WEIGHT;
    const rarityTier = {
        'One Diamond': 0,
        'Two Diamond': 0,
        'Three Diamond': 1,
        'Four Diamond': 2,
        'One Star': 3,
        'Two Star': 4,
        'Three Star': 5,
        'One Shiny': 4,
        'Two Shiny': 5,
        Crown: 6
    }[rarity] ?? 0;

    return baseWeight * (1 + (chanceLevel * rarityTier * 0.25));
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
    return card.rarity || 'Unknown';
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
    searchPocketCards,
    generatePack
};
