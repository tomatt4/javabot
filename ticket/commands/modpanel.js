const fs = require('node:fs');
const path = require('node:path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { buildContainerPayload, asV2Message } = require('../utils/ui');

const MOD_ROLE_ID = '1532532641646247946';
const PUNISHMENT_LOG_CHANNEL_ID = '1524121879571599391';
const DATA_PATH = path.join(__dirname, '..', 'data', 'moderation.json');

function hasModRole(interaction) {
  return Boolean(interaction.member?.roles?.cache?.has(MOD_ROLE_ID));
}

function deny(interaction) {
  return interaction.reply({
    content: 'Apenas membros com o cargo de moderação podem usar este painel.',
    ephemeral: true
  });
}

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveRecord(record) {
  const history = readHistory();
  history.unshift(record);
  fs.writeFileSync(DATA_PATH, JSON.stringify(history.slice(0, 500), null, 2));
}

async function notifyPunishment(client, { guild, member, action, reason, moderatorId, punishedAt }) {
  const timestamp = `<t:${Math.floor(punishedAt.getTime() / 1000)}:F>`;
  const message = [
    '## Registro de punição',
    `**Usuário punido:** <@${member.id}> (${member.user.tag})`,
    `**Punição:** ${action.toUpperCase()}`,
    `**Motivo:** ${reason}`,
    `**Aplicada por:** <@${moderatorId}>`,
    `**Momento:** ${timestamp}`
  ].join('\n');

  if (action === 'warn') {
    try {
      await member.send({
        content: [
          `Você recebeu um **Aviso** no servidor **${guild.name}**.`,
          `**Motivo:** ${reason}`,
          `**Moderador:** ${interactionUserTag(guild, moderatorId)}`,
          `**Momento:** ${timestamp}`
        ].join('\n')
      });
      return;
    } catch {}
  }

  const channel = await client.channels.fetch(PUNISHMENT_LOG_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased()) return;

  await channel.send({
    content: message,
    allowedMentions: {
      users: [member.id, moderatorId]
    }
  });
}

function interactionUserTag(guild, userId) {
  return guild.client.users.cache.get(userId)?.tag ?? `<@${userId}>`;
}

function buildPanel(client) {
  const buttons = [
    new ButtonBuilder().setCustomId('modpanel:warn').setLabel('Avisar').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('modpanel:timeout').setLabel('Castigar').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('modpanel:kick').setLabel('Expulsar').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('modpanel:ban').setLabel('Banir').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('modpanel:history').setLabel('Histórico').setStyle(ButtonStyle.Secondary)
  ];
  const row = new ActionRowBuilder().addComponents(buttons);

  return asV2Message(buildContainerPayload({
    title: 'Painel de moderação',
    body: 'Selecione uma ação abaixo para moderar um membro do servidor.',
    rows: [row],
    accentColor: client.config.defaults.accentColor
  }));
}

function buildUserSelect(action) {
  const select = new UserSelectMenuBuilder()
    .setCustomId(`modpanel_target:${action}`)
    .setPlaceholder('Selecione o membro')
    .setMinValues(1)
    .setMaxValues(1);
  return new ActionRowBuilder().addComponents(select);
}

function buildActionModal(action, userId) {
  const modal = new ModalBuilder()
    .setCustomId(`modpanel_modal:${action}:${userId}`)
    .setTitle(`${action[0].toUpperCase()}${action.slice(1)} de membro`);
  const reason = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel('Motivo')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(new ActionRowBuilder().addComponents(reason));

  if (action === 'timeout') {
    const duration = new TextInputBuilder()
      .setCustomId('duration')
      .setLabel('Duração em minutos (1 a 40320)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(5);
    modal.addComponents(new ActionRowBuilder().addComponents(duration));
  }

  return modal;
}

function historyBody(guild, userId = null) {
  const records = readHistory().filter((record) => record.guildId === guild.id && (!userId || record.targetId === userId));
  if (!records.length) return 'Nenhum registro de moderação encontrado.';

  return records.slice(0, 15).map((record) => {
    const timestamp = Math.floor(new Date(record.createdAt).getTime() / 1000);
    return `<t:${timestamp}:d> **${record.action.toUpperCase()}** <@${record.targetId}> por <@${record.moderatorId}>\n> ${record.reason}`;
  }).join('\n');
}

async function handleModPanelInteraction(interaction) {
  const id = interaction.customId;
  if (!id.startsWith('modpanel:') && !id.startsWith('modpanel_target:') && !id.startsWith('modpanel_modal:')) return false;
  if (!hasModRole(interaction)) {
    await deny(interaction);
    return true;
  }

  if (interaction.isButton() && id === 'modpanel:history') {
    await interaction.reply(asV2Message(buildContainerPayload({
      title: 'Histórico de moderação',
      body: historyBody(interaction.guild),
      accentColor: interaction.client.config.defaults.accentColor
    }), { ephemeral: true }));
    return true;
  }

  if (interaction.isButton() && id.startsWith('modpanel:')) {
    const action = id.split(':')[1];
    await interaction.reply(asV2Message(buildContainerPayload({
      title: `Selecionar membro para ${action}`,
      body: 'Escolha o membro que receberá a ação.',
      rows: [buildUserSelect(action)],
      accentColor: interaction.client.config.defaults.accentColor
    }), { ephemeral: true }));
    return true;
  }

  if (interaction.isUserSelectMenu() && id.startsWith('modpanel_target:')) {
    const action = id.split(':')[1];
    const userId = interaction.values[0];
    if (action === 'history') {
      await interaction.update(asV2Message(buildContainerPayload({
        title: 'Histórico do membro',
        body: historyBody(interaction.guild, userId),
        accentColor: interaction.client.config.defaults.accentColor
      })));
      return true;
    }
    await interaction.showModal(buildActionModal(action, userId));
    return true;
  }

  if (interaction.isModalSubmit() && id.startsWith('modpanel_modal:')) {
    const [, action, userId] = id.split(':');
    const reason = interaction.fields.getTextInputValue('reason').trim();
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'Esse membro não está mais no servidor.', ephemeral: true });
      return true;
    }
    if (member.id === interaction.user.id || (action !== 'warn' && !member.moderatable)) {
      await interaction.reply({ content: 'Não é possível aplicar essa ação nesse membro por causa da hierarquia do Discord.', ephemeral: true });
      return true;
    }

    const auditReason = `${reason} | por ${interaction.user.tag}`;
    if (action === 'timeout') {
      const minutes = Number(interaction.fields.getTextInputValue('duration'));
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 40320) {
        await interaction.reply({ content: 'A duração deve ser um número inteiro entre 1 e 40320 minutos.', ephemeral: true });
        return true;
      }
      await member.timeout(minutes * 60 * 1000, auditReason);
    } else if (action === 'kick') {
      await member.kick(auditReason);
    } else if (action === 'ban') {
      await member.ban({ reason: auditReason });
    }

    const punishedAt = new Date();
    saveRecord({ action, guildId: interaction.guild.id, targetId: userId, moderatorId: interaction.user.id, reason, createdAt: punishedAt.toISOString() });
    await notifyPunishment(interaction.client, {
      guild: interaction.guild,
      member,
      action,
      reason,
      moderatorId: interaction.user.id,
      punishedAt
    }).catch(() => null);
    await interaction.reply({ content: `${action.toUpperCase()} aplicado com sucesso em ${member.user.tag}.`, ephemeral: true });
    return true;
  }

  return true;
}

module.exports = {
  MOD_ROLE_ID,
  handleModPanelInteraction,
  data: new SlashCommandBuilder()
    .setName('modpanel')
    .setDescription('Abre o painel de moderação.'),
  async execute(client, interaction) {
    if (!interaction.guild) return interaction.reply({ content: 'Este comando só pode ser usado em um servidor.', ephemeral: true });
    if (!hasModRole(interaction)) return deny(interaction);
    await interaction.reply(buildPanel(client));
  }
};