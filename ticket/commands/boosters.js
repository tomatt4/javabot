const { SlashCommandBuilder } = require('discord.js');
const { buildContainerPayload, asV2Message } = require('../utils/ui');
const { requireGuild, formatNumber } = require('../utils/commandInfo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boosters')
    .setDescription('Lista os membros que impulsionam o servidor.'),

  async execute(client, interaction) {
    if (!requireGuild(interaction)) return;
    const guild = interaction.guild;
    await guild.members.fetch().catch(() => null);
    const boosters = guild.members.cache.filter((member) => member.premiumSince);
    const names = boosters.map((member) => `• ${member} (${member.user.tag})`).join('\n');
    const body = names || 'Nenhum membro está impulsionando o servidor no momento.';

    await interaction.reply(asV2Message(buildContainerPayload({
      title: `Boosters de ${guild.name}`,
      body: `**Total:** ${formatNumber(boosters.size)}\n\n${body}`,
      accentColor: client.config.defaults.accentColor
    })));
  }
};