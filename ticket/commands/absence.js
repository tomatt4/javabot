const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags 
} = require('discord.js');
const { query } = require('../utils/database'); // Ajuste o caminho para o seu arquivo postgres

const ABSENCE_LOG_CHANNEL_ID = '1539753657300418651';
const MAX_TIMEOUT_MS = 2_147_483_647;

// Função para converter strings de tempo (ex: "3h", "5 min", "2 horas", "30m") em milissegundos
function parseDuration(input) {
  const regex = /(\d+)\s*(h|hr|hrs|hora|horas|m|min|mins|minuto|minutos|d|dia|dias)/gi;
  let totalMs = 0;
  let match;

  while ((match = regex.exec(input)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('d')) {
      totalMs += value * 24 * 60 * 60 * 1000;
    } else if (unit.startsWith('h')) {
      totalMs += value * 60 * 60 * 1000;
    } else if (unit.startsWith('m')) {
      totalMs += value * 60 * 1000;
    }
  }

  return totalMs > 0 ? totalMs : null;
}

async function finishAbsence(client, absence) {
  const result = await query(
    `DELETE FROM staff_absences WHERE id = $1 AND expires_at <= NOW() RETURNING user_id`,
    [absence.id]
  );

  if (result.rowCount === 0) return;

  const logChannel = await client.channels.fetch(ABSENCE_LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel) return;

  const endContainer = new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('### 🟢 Ausência Finalizada'),
      new TextDisplayBuilder().setContent(`O staff <@${absence.user_id}> retornou da ausência.`)
    );

  await logChannel.send({
    content: `<@${absence.user_id}>`,
    components: [endContainer],
    flags: MessageFlags.IsComponentsV2
  });
}

function scheduleAbsence(client, absence) {
  const remainingMs = new Date(absence.expires_at).getTime() - Date.now();
  const delay = Math.max(0, Math.min(remainingMs, MAX_TIMEOUT_MS));

  setTimeout(async () => {
    try {
      if (remainingMs > MAX_TIMEOUT_MS) {
        scheduleAbsence(client, absence);
        return;
      }

      await finishAbsence(client, absence);
    } catch (err) {
      console.error('Erro ao finalizar ausência automaticamente:', err);
    }
  }, delay);
}

// 1. Enviar o Painel de Ausência utilizando Components V2 (Containers)
async function sendAbsencePanel(channel) {
  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('### 🛡️ Registro de Ausência da Staff'),
      new TextDisplayBuilder().setContent('Vai se ausentar? Clique no botão abaixo para registrar sua ausência e notificar a equipe de forma estruturada.')
    );

  const separator = new SeparatorBuilder()
    .setSpacing(SeparatorSpacingSize.Small);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('staff_absence_btn')
      .setLabel('Ausentar-se')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⏰')
  );

  await channel.send({ 
    components: [container, separator, row],
    flags: MessageFlags.IsComponentsV2 
  });
}

// 2. Interceptador de Interações (Botões e Modals)
async function handleAbsenceInteraction(interaction) {
  // Quando clica no botão "Ausentar-se"
  if (interaction.isButton() && interaction.customId === 'staff_absence_btn') {
    const modal = new ModalBuilder()
      .setCustomId('staff_absence_modal')
      .setTitle('Ausência Cruel');

    const reasonInput = new TextInputBuilder()
      .setCustomId('absence_reason')
      .setLabel('Qual o motivo da ausência?')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Ex: Viagem, problemas pessoais, provas...')
      .setRequired(true);

    const timeInput = new TextInputBuilder()
      .setCustomId('absence_time')
      .setLabel('Quanto tempo de ausência?')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 3 horas, 5h, 30m, 2 dias')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(reasonInput),
      new ActionRowBuilder().addComponents(timeInput)
    );

    return await interaction.showModal(modal);
  }

  // Quando envia o Modal
  if (interaction.isModalSubmit() && interaction.customId === 'staff_absence_modal') {
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.fields.getTextInputValue('absence_reason');
    const timeString = interaction.fields.getTextInputValue('absence_time');
    
    const durationMs = parseDuration(timeString);

    if (!durationMs) {
      return interaction.editReply({ 
        content: '❌ Formato de tempo inválido! Use exemplos como: `3 horas`, `5h`, `30 minutos`, `5m`.' 
      });
    }

    const expiresAt = new Date(Date.now() + durationMs);

    // Salvar no Banco de Dados PostgreSQL
    const absenceResult = await query(
      `INSERT INTO staff_absences (guild_id, user_id, reason, expires_at) VALUES ($1, $2, $3, $4) RETURNING id`,
      [interaction.guildId, interaction.user.id, reason, expiresAt]
    );

    const absence = {
      id: absenceResult.rows[0].id,
      user_id: interaction.user.id,
      expires_at: expiresAt
    };
    const logChannel = await interaction.client.channels.fetch(ABSENCE_LOG_CHANNEL_ID).catch(() => null);

    const timestampRelative = `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`;

    // Container V2 para o aviso de Staff Ausente
    const startContainer = new ContainerBuilder()
      .setAccentColor(0xFEE75C)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### 📌 Staff Ausente'),
        new TextDisplayBuilder().setContent(`**Staff:** ${interaction.user} (${interaction.user.tag})\n**Motivo:** ${reason}\n**Retorno Previsto:** ${timestampRelative}`)
      );

    if (logChannel) {
      await logChannel.send({ 
        components: [startContainer],
        flags: MessageFlags.IsComponentsV2 
      });
    }

    await interaction.editReply({ 
      content: `✅ Ausência registrada com sucesso! Seu retorno está marcado para ${timestampRelative}.` 
    });

    scheduleAbsence(interaction.client, absence);
  }
}

async function restoreAbsenceTimers(client) {
  const result = await query(
    `SELECT id, user_id, expires_at FROM staff_absences ORDER BY expires_at ASC`
  );

  for (const absence of result.rows) {
    scheduleAbsence(client, absence);
  }
}

async function checkAndSendAbsencePanel(client) {
  const channelId = '1524121370122780932';
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel) return console.log('❌ Canal de ausência não encontrado.');

  // Busca as últimas 10 mensagens do canal para ver se o painel já existe
  const messages = await channel.messages.fetch({ limit: 10 });
  
  // Verifica se alguma mensagem enviada pelo bot contém o botão 'staff_absence_btn'
  const hasPanel = messages.some(msg => {
    if (msg.author.id !== client.user.id) return false;

    return msg.components?.some(row =>
      row.components?.some(component =>
        component.customId === 'staff_absence_btn'
      )
    ) ?? false;
  });

  if (!hasPanel) {
    await sendAbsencePanel(channel);
    console.log('✅ Painel de ausência enviado com sucesso!');
  } else {
    console.log('ℹ️ O painel de ausência já existe no canal.');
  }
}

module.exports = {
  sendAbsencePanel,
  handleAbsenceInteraction,
  restoreAbsenceTimers,
  parseDuration,
  checkAndSendAbsencePanel
};