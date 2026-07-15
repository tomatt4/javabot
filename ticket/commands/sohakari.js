const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sohakari')
    .setDescription('so hakari'),

  async execute(client, interaction) {
    await interaction.reply('so hakari');
  }
};
