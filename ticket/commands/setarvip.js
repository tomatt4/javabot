const { SlashCommandBuilder } = require('discord.js');
const { createVipAssignment } = require('../utils/database');
const { VIP_MANAGER_ROLE_ID, scheduleVipExpiration } = require('./vip');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setarvip')
    .setDescription('Define um cargo VIP para um usuário por 30 dias.')
    .addRoleOption((option) => option.setName('cargo').setDescription('Cargo VIP que será atribuído').setRequired(true))
    .addUserOption((option) => option.setName('user').setDescription('Usuário que receberá o VIP').setRequired(true)),

  async execute(client, interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'Este comando só pode ser usado em um servidor.', ephemeral: true });
    }

    if (!interaction.member.roles.cache.has(VIP_MANAGER_ROLE_ID)) {
      return interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
    }

    const role = interaction.options.getRole('cargo', true);
    const user = interaction.options.getUser('user', true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ content: 'O usuário não está neste servidor.', ephemeral: true });
    if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: 'Não consigo gerenciar esse cargo. Verifique a hierarquia de cargos do bot.', ephemeral: true });
    }

    await member.roles.add(role, `VIP definido por ${interaction.user.tag}`);
    const assignment = await createVipAssignment({
      guildId: interaction.guild.id,
      userId: user.id,
      roleId: role.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    scheduleVipExpiration(client, assignment);
    return interaction.reply({
      content: `VIP definido para <@${user.id}> com o cargo <@&${role.id}>. A expiração ocorrerá em 30 dias.`,
      ephemeral: true,
      allowedMentions: { users: [user.id], roles: [role.id] }
    });
  }
};