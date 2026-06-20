const SYSTEM_PROMPT = `You summarize Discord conversations in the style of Instagram's message summary feature.
Write a short, natural-English paragraph. Mention the participants by name, the main
topics discussed, and any outcomes or resolutions reached. Do not use bullet points. Do not
pad with filler. Be concise — 2 to 4 sentences is ideal. Do not editorialize or add opinions
not present in the conversation.`;

async function summarizeTranscript(transcript) {
    const keys = getGroqKeys();

    if (keys.length === 0) {
        throw new Error('No Groq API keys configured (expected GROQ1, GROQ2, ... in environment variables)');
    }

    const { default: fetch } = await import('node-fetch');

    for (let i = 0; i < keys.length; i++) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${keys[i]}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: transcript }
                    ],
                    temperature: 0.4,
                    max_tokens: 300
                })
            });

            if (response.status !== 200) {
                console.log(`[groqClient] Key index ${i} failed with status ${response.status}, trying next key`);
                continue;
            }

            const data = await response.json();
            const summary = data?.choices?.[0]?.message?.content?.trim();

            if (summary) {
                return summary;
            }

            console.log(`[groqClient] Key index ${i} failed with empty response, trying next key`);
        } catch (error) {
            console.log(`[groqClient] Key index ${i} failed with error, trying next key`);
        }
    }

    throw new Error('All Groq API keys failed');
}

// Keys must be numbered contiguously starting at GROQ1; the scan stops at the first missing key.
function getGroqKeys() {
    const keys = [];
    let i = 1;
    while (true) {
        const key = process.env[`GROQ${i}`];
        if (!key) break;
        const trimmed = key.trim();
        if (trimmed) keys.push(trimmed);
        i++;
    }
    return keys;
}

module.exports = { summarizeTranscript };
