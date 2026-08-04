const { SlashCommandBuilder } = require('discord.js');
const { getGuildData } = require('../utils/database');
const { canManagePanel } = require('../utils/permissions');
const { buildHomePanel } = require('../utils/managementPanel');
const { buildContainerPayload, asV2Message } = require('../utils/ui');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Abre o painel central de gerenciamento do bot.'),

  // Aceita (client, interaction) ou só (interaction)
  async execute(clientOrInteraction, maybeInteraction) {
    const interaction = maybeInteraction ?? clientOrInteraction;
    const client = maybeInteraction ? clientOrInteraction : interaction?.client;

    // Se não temos uma interaction válida, tente responder só se possível,
    // caso contrário apenas saia.
    if (!interaction || !interaction.guild) {
      if (interaction && typeof interaction.reply === 'function') {
        return interaction.reply({
          content: 'Este comando só pode ser utilizado em um servidor.',
          ephemeral: true
        }).catch(() => {});
      }
      return;
    }

    // Defer para ganhar tempo (ignore falha silenciosamente)
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch (err) {
      // se defer falhar, continuamos; podem haver situações em que já foi respondido
    }

    try {
      const guildData = await getGuildData(interaction.guild.id);

      if (!(await canManagePanel(interaction, guildData))) {
        const payload = buildContainerPayload({
          title: '<:negativobranco:1525565869407736029> ACESSO NEGADO',
          body: 'Você não tem permissão para abrir o painel de gerenciamento.',
          accentColor: guildData?.panel?.accentColor || '#ff0000'
        });

        // editReply porque chamamos deferReply acima
        return interaction.editReply(asV2Message(payload)).catch(() => {});
      }

      return interaction.editReply(asV2Message(buildHomePanel(guildData, client))).catch(() => {});
    } catch (error) {
      console.error('Erro ao executar o comando /painel:', error);

      // Se já deferimos/reply, use editReply; caso contrário reply
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: 'Ocorreu um erro ao carregar o painel. Verifique o console.'
        }).catch(() => {});
      } else {
        return interaction.reply({
          content: 'Ocorreu um erro ao carregar o painel. Verifique o console.',
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
