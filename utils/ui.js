const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
    Message,
    Webhook,
    CommandInteraction,
    MessageComponentInteraction,
    BaseGuildTextChannel,
    DMChannel
} = require('discord.js');

const COLORS = {
    brand: 0x5865f2,
    success: 0x57f287,
    warning: 0xfee75c,
    danger: 0xed4245,
    neutral: 0x2b2d31
};

function text(content) {
    return new TextDisplayBuilder().setContent(String(content).slice(0, 4_000));
}

/** A consistent Components v2 response for commands, errors, and notices. */
function card({ title, body, tone = 'brand', thumbnail, footer, components = [] }) {
    const container = new ContainerBuilder().setAccentColor(COLORS[tone] ?? COLORS.brand);
    const heading = title ? `## ${title}` : null;

    if (thumbnail && heading) {
        container.addSectionComponents(section => section
            .addTextDisplayComponents(text(heading))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail)));
    } else if (heading) {
        container.addTextDisplayComponents(text(heading));
    }

    if (body) {
        if (heading) container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(text(body));
    }

    if (components.length) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addActionRowComponents(...components);
    }

    if (footer) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(text(`-# ${footer}`));
    }

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function notice(message, tone = 'neutral') {
    return card({ body: message, tone });
}

function linkButton(label, url, emoji) {
    const button = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url);
    if (emoji) button.setEmoji(emoji);
    return new ActionRowBuilder().addComponents(button);
}

function containerFromEmbed(embed, trailingRows = []) {
    const data = typeof embed?.toJSON === 'function' ? embed.toJSON() : embed || {};
    const parts = [];
    if (data.description) parts.push(data.description);
    if (Array.isArray(data.fields) && data.fields.length) {
        const fieldLines = [];
        let inlineFields = [];
        const flushInlineFields = () => {
            if (!inlineFields.length) return;
            fieldLines.push(inlineFields.map(field => `**${field.name}:** ${field.value}`).join('  •  '));
            inlineFields = [];
        };
        for (const field of data.fields) {
            if (field.inline) {
                inlineFields.push(field);
                if (inlineFields.length === 2) flushInlineFields();
            } else {
                flushInlineFields();
                fieldLines.push(`**${field.name}**\n${field.value}`);
            }
        }
        flushInlineFields();
        parts.push(fieldLines.join('\n'));
    }
    if (data.footer?.text) parts.push(`-# ${data.footer.text}`);

    const container = new ContainerBuilder().setAccentColor(data.color ?? COLORS.brand);
    const title = data.author?.name ? `## ${data.author.name}${data.title ? `\n${data.title}` : ''}` : data.title ? `## ${data.title}` : null;
    const thumbnail = data.thumbnail?.url || data.author?.icon_url;

    if (title && thumbnail) {
        container.addSectionComponents(section => section
            .addTextDisplayComponents(text(title))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail)));
    } else if (title) {
        container.addTextDisplayComponents(text(title));
    }

    if (parts.length) {
        if (title) container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(text(parts.join('\n')));
    }

    if (data.image?.url) {
        container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(data.image.url)
        ));
    }
    if (trailingRows.length) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        container.addActionRowComponents(...trailingRows);
    }
    return container;
}

function normalizePayload(payload) {
    if (payload == null) return payload;
    if (typeof payload === 'string') return notice(payload);
    if (Array.isArray(payload) || typeof payload !== 'object') return payload;
    if (payload.flags && (Number(payload.flags) & MessageFlags.IsComponentsV2)) return payload;

    const { embeds = [], components = [], content, ephemeral, ...rest } = payload;
    if (!embeds.length && !content) return payload;

    const rows = components.filter(component => component?.components || component?.toJSON?.().components);
    const normalizedEmbeds = embeds.map(embed => {
        if (!content) return embed;
        const data = typeof embed?.toJSON === 'function' ? embed.toJSON() : embed;
        return { ...data, description: [content, data.description].filter(Boolean).join('\n\n') };
    });
    const containers = normalizedEmbeds.length
        ? normalizedEmbeds.map((embed, index) => containerFromEmbed(embed, index === normalizedEmbeds.length - 1 ? rows : []))
        : [containerFromEmbed({ description: content }, rows)];

    return {
        ...rest,
        components: containers,
        flags: (Number(payload.flags) || 0) |
            (ephemeral ? MessageFlags.Ephemeral : 0) |
            MessageFlags.IsComponentsV2
    };
}

function wrapMethod(prototype, name) {
    if (!prototype || prototype[name]?.__containerUi) return;
    const original = prototype[name];
    if (typeof original !== 'function') return;
    function wrapped(payload, ...rest) {
        return original.call(this, normalizePayload(payload), ...rest);
    }
    wrapped.__containerUi = true;
    prototype[name] = wrapped;
}

/**
 * Applies Components v2 to every outbound bot response, including legacy
 * commands that still construct an EmbedBuilder. This protects behavior while
 * the presentation layer uses modern Discord containers consistently.
 */
function installModernUi() {
    wrapMethod(Message.prototype, 'reply');
    wrapMethod(Message.prototype, 'edit');
    wrapMethod(Webhook.prototype, 'send');
    wrapMethod(Webhook.prototype, 'edit');
    wrapMethod(BaseGuildTextChannel.prototype, 'send');
    wrapMethod(DMChannel.prototype, 'send');
    for (const prototype of [CommandInteraction.prototype, MessageComponentInteraction.prototype]) {
        for (const method of ['reply', 'editReply', 'followUp', 'update']) wrapMethod(prototype, method);
    }
}

module.exports = { COLORS, card, notice, linkButton, normalizePayload, installModernUi };
