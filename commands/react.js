const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('react')
        .setDescription('React to a message with a specified emoji')
        .addStringOption(option =>
            option
                .setName('emoji')
                .setDescription('Emoji or emoji ID to react with')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Message ID or full message URL')
                .setRequired(true)
        ),

    async execute(interaction) {
        const requiredRoleId = '1331818656996261898';
        const member = interaction.member;

        // Permission check
        if (!member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true,
            });
        }

        const emoji = interaction.options.getString('emoji');
        let messageInput = interaction.options.getString('message');
        let channel, messageId;

        // Parse message input (ID or URL)
        const urlMatch = messageInput.match(/https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
        if (urlMatch) {
            // Extract channel and message ID from URL
            [, , channel, messageId] = urlMatch;
        } else if (/^\d+$/.test(messageInput)) {
            // Only message ID provided, use current channel
            channel = interaction.channel.id;
            messageId = messageInput;
        } else {
            return interaction.reply({
                content: 'Invalid message ID or URL.',
                ephemeral: true,
            });
        }

        try {
            const targetChannel = await interaction.client.channels.fetch(channel);
            if (!targetChannel || !targetChannel.isTextBased()) {
                return interaction.reply({
                    content: 'Could not find the specified channel.',
                    ephemeral: true,
                });
            }

            const targetMessage = await targetChannel.messages.fetch(messageId);
            if (!targetMessage) {
                return interaction.reply({
                    content: 'Could not find the specified message.',
                    ephemeral: true,
                });
            }

            await targetMessage.react(emoji);
            return interaction.reply({
                content: `Reacted to [this message](https://discord.com/channels/${interaction.guildId}/${channel}/${messageId}) with ${emoji}.`,
                ephemeral: true,
            });
        } catch (err) {
            return interaction.reply({
                content: `Failed to react: ${err.message}`,
                ephemeral: true,
            });
        }
    },
};