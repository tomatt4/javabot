const { SlashCommandBuilder } = require('discord.js');
const { buildContainerPayload, asV2Message } = require('../utils/ui');
const { requireGuild, formatNumber, formatDuration } = require('../utils/commandInfo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Mostra estatísticas do bot e do servidor.'),

  async execute(client, interaction) {
    if (!requireGuild(interaction)) return;
    const guild = interaction.guild;
    const uptime = Math.floor((Date.now() - client.launchTime) / 1000);
    const body = [
      `**Latência:** ${Math.round(client.ws.ping || 0)}ms`,
      `**Uptime:** ${formatDuration(uptime)}`,
      `**Servidores:** ${formatNumber(client.guilds.cache.size)}`,
      `**Usuários em cache:** ${formatNumber(client.users.cache.size)}`,
      `**Membros neste servidor:** ${formatNumber(guild.memberCount)}`,
      `**Node.js:** ${process.version}`
    ].join('\n');

    await interaction.reply(asV2Message(buildContainerPayload({
      title: 'Estatísticas',
      body,
      accentColor: client.config.defaults.accentColor
    })));
  }
};