const {SlashCommandBuilder, Guild, MessageFlags, EmbedBuilder} = require('discord.js');
const client = require('../src/globals/Client')
module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('About this bot'),
    async execute(interaction){
        const aboutembed = new EmbedBuilder()
            .setColor(0xef00ff)
            .setTitle(`About ${client.user.tag}`)
            .setDescription('Smth goes here.')

        interaction.reply({ embeds: [aboutembed]});
    }
}