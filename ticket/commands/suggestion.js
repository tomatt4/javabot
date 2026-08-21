const { SlashCommandBuilder } = require('discord.js');
const { buildContainerPayload, asV2Message } = require('../utils/ui');
const { requireGuild } = require('../utils/commandInfo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Mostra uma sugestão para quem acabou de chegar ao servidor.'),

  async execute(client, interaction) {
    if (!requireGuild(interaction)) return;
    const suggestions = client.config.defaults.newMemberSuggestions;
    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];

    await interaction.reply(asV2Message(buildContainerPayload({
      title: 'Sugestão para começar',
      body: suggestion || 'Explore o servidor e participe da comunidade!',
      accentColor: client.config.defaults.accentColor
    }), { ephemeral: true }));
  }
};