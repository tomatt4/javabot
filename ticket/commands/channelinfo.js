const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { buildContainerPayload, asV2Message } = require('../utils/ui');
const { requireGuild, formatDate } = require('../utils/commandInfo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Mostra informações sobre um canal.')
    .addChannelOption((option) => option
      .setName('canal')
      .setDescription('Canal que será consultado. Por padrão, o canal atual.')
      .setRequired(false)),

  async execute(client, interaction) {
    if (!requireGuild(interaction)) return;
    const channel = interaction.options.getChannel('canal') ?? interaction.channel;
    const channelType = Object.entries(ChannelType).find(([, value]) => value === channel.type)?.[0] ?? channel.type;
    const body = [
      `**ID:** ${channel.id}`,
      `**Tipo:** ${channelType}`,
      `**Criado em:** ${formatDate(channel.createdAt)}`,
      `**Categoria:** ${channel.parent ? `${channel.parent} (${channel.parent.name})` : 'Nenhuma'}`,
      channel.isTextBased() ? `**Mensagens:** ${channel.messages ? 'Disponíveis' : 'Não disponíveis'}` : '**Mensagens:** Não aplicável'
    ].join('\n');

    await interaction.reply(asV2Message(buildContainerPayload({
      title: `Informações de ${channel.name ?? 'canal'}`,
      body,
      accentColor: client.config.defaults.accentColor
    })));
  }
};