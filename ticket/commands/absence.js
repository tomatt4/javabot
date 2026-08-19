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
async function handleAbsenceInteraction(client, interction) {
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
    await query(
      `INSERT INTO staff_absences (guild_id, user_id, reason, expires_at) VALUES ($1, $2, $3, $4)`,
      [interaction.guildId, interaction.user.id, reason, expiresAt]
    );

    // Canal onde será postado o aviso
    const logChannelId = '1539753657300418651'; // Substitua pelo ID do seu canal
    const logChannel = interaction.guild.channels.cache.get(logChannelId);

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

    // Agendar o término da ausência usando setTimeout
    setTimeout(async () => {
      try {
        // Remover do banco
        await query(
          `DELETE FROM staff_absences WHERE guild_id = $1 AND user_id = $2 AND expires_at = $3`,
          [interaction.guildId, interaction.user.id, expiresAt]
        );

        if (logChannel) {
          // Container V2 para o aviso de Retorno
          const endContainer = new ContainerBuilder()
            .setAccentColor(0x57F287)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('### 🟢 Ausência Finalizada'),
              new TextDisplayBuilder().setContent(`O staff ${interaction.user} retornou da ausência.`)
            );

          await logChannel.send({ 
            content: `${interaction.user}`, 
            components: [endContainer],
            flags: MessageFlags.IsComponentsV2 
          });
        }
      } catch (err) {
        console.error('Erro ao finalizar ausência automaticamente:', err);
      }
    }, durationMs);
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
  parseDuration,
  checkAndSendAbsencePanel
};