const { SlashCommandBuilder } = require('discord.js');
const { buildContainerPayload, asV2Message } = require('../utils/ui');
const { requireGuild, formatNumber } = require('../utils/commandInfo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('Mostra o contador de membros do servidor.'),

  async execute(client, interaction) {
    if (!requireGuild(interaction)) return;
    const guild = interaction.guild;
    const body = [
      `**Total:** ${formatNumber(guild.memberCount)}`,
      `**Humanos em cache:** ${formatNumber(guild.members.cache.filter((member) => !member.user.bot).size)}`,
      `**Bots em cache:** ${formatNumber(guild.members.cache.filter((member) => member.user.bot).size)}`
    ].join('\n');

    await interaction.reply(asV2Message(buildContainerPayload({
      title: `Membros de ${guild.name}`,
      body,
      accentColor: client.config.defaults.accentColor
    })));
  }
};