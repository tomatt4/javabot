const { SlashCommandBuilder } = require('discord.js');
const { buildContainerPayload, asV2Message } = require('../utils/ui');
const { requireGuild, formatNumber, formatDate } = require('../utils/commandInfo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Mostra informações sobre o servidor.'),

  async execute(client, interaction) {
    if (!requireGuild(interaction)) return;
    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);
    const body = [
      `**ID:** ${guild.id}`,
      `**Dono:** ${owner ? owner.user.tag : 'Indisponível'}`,
      `**Criado em:** ${formatDate(guild.createdAt)}`,
      `**Membros:** ${formatNumber(guild.memberCount)}`,
      `**Canais:** ${formatNumber(guild.channels.cache.size)}`,
      `**Cargos:** ${formatNumber(guild.roles.cache.size)}`,
      `**Boosts:** ${formatNumber(guild.premiumSubscriptionCount ?? 0)} (nível ${guild.premiumTier})`
    ].join('\n');

    await interaction.reply(asV2Message(buildContainerPayload({
      title: `Informações de ${guild.name}`,
      body,
      accentColor: client.config.defaults.accentColor
    })));
  }
};