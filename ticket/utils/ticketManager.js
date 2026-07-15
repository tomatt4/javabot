const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ContainerBuilder
} = require('discord.js');

const logger = require('./logger');
const {
  createTicketRecord,
  getGuildData,
  incrementTicketCounter,
  updateTicket,
  getSystemData,
  setLastPanelMessage
} = require('./database');
const { chunkArray } = require('./helpers');
const { createTranscriptFile } = require('./transcript');
const { buildContainerPayload, asV2Message } = require('./ui');
const config = require('../config');

function buildGalleryComponent(guildData) {
  const items = [];

  if (guildData.panel.bannerUrl) {
    items.push({
      media: { url: guildData.panel.bannerUrl },
      description: 'Banner do painel'
    });
  }

  if (guildData.panel.imageUrl) {
    items.push({
      media: { url: guildData.panel.imageUrl },
      description: 'Imagem do painel'
    });
  }

  if (!items.length) return null;

  return {
    type: 12,
    items
  };
}

function createButtonRows(buttons) {
  const chunks = chunkArray(buttons, 5);
  return chunks.map((chunk) => {
    const row = new ActionRowBuilder();

    row.addComponents(
      chunk.map((button) => {
        const builder = new ButtonBuilder()
          .setCustomId(`panel_open:button:${button.id}`)
          .setLabel(button.label)
          .setStyle(button.style || ButtonStyle.Primary);

        return builder;
      })
    );

    return row;
  });
}

function createSelectRows(selectMenus) {
  return selectMenus
    .filter((menu) => Array.isArray(menu.options) && menu.options.length)
    .map((menu) => {
      const row = new ActionRowBuilder();
      const builder = new StringSelectMenuBuilder()
        .setCustomId(`panel_open:select:${menu.id}`)
        .setPlaceholder(menu.placeholder || 'Escolha uma opção')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          menu.options.map((option) => ({
            label: option.label,
            value: option.value,
            description: option.description || undefined
          }))
        );

      row.addComponents(builder);
      return row;
    });
}

function buildPublicPanelMessage(guildData) {
  const container = new ContainerBuilder()
    .setAccentColor(guildData.panel.accentColor);

  const galleryComponent = buildGalleryComponent(guildData);

  if (galleryComponent) {
    container.addMediaGalleryComponents(galleryComponent);
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${guildData.panel.title}\n${guildData.panel.description}`
    )
  );

  const buttonRows = createButtonRows(guildData.panel.buttons);
  const selectRows = createSelectRows(guildData.panel.selectMenus);

  for (const row of [...buttonRows, ...selectRows]) {
    container.addActionRowComponents(row);
  }

  return { components: [container] };
}

function buildTicketMessage(guildData, ticket) {
  const container = new ContainerBuilder().setAccentColor(guildData.panel.accentColor);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `# <:n_ticket:1526716703520723014> Ticket #${String(ticket.ticketNumber).padStart(4, '0')}`,
        `<:members:1525579493375213700> **Usuário:** <@${ticket.ownerId}>`,
        `-# ~~                                                                                  ~~`,
        `<:anncio:1526784690911055925> **Ping:** <@&1500969290093039626> `,
        `-# ~~                                                                                  ~~`,
        `<:calendar:1525579207818608682> **Aberto em:** <t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:f>`,
        `-# ~~                                                                                  ~~`,
        `<:safety:1525566462406950954> **Staff que Assumiu:** ${ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Ninguém por enquanto.'}`,
        `-# ~~                                                                                  ~~`,
        `**ATENÇÃO**: usuários abaixo do cargo Gerente devem pedir **PERMISSÃO** de quem assumiu para interferir no Ticket.`,
        `-# ~~                                                                                  ~~`,
        `**Se a equipe demorar demais para te atender**, clique no botão '**Notificar Equipe**'.`
      ].join('\n')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const buttonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Assumir Ticket').setStyle(ButtonStyle.Secondary).setEmoji('<:check:1525566649384702023>'),
    new ButtonBuilder().setCustomId('ticket_notify_user').setLabel('Notificar Usuário').setStyle(ButtonStyle.Secondary).setEmoji('<a:white_exclamation:1526717172825718856>'),
    new ButtonBuilder().setCustomId('ticket_notify_staff').setLabel('Notificar Equipe').setStyle(ButtonStyle.Secondary).setEmoji('<:anncio:1526784690911055925>'),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('<:negativobranco:1525565869407736029>')
  );

  const staffRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_staff_panel')
      .setPlaceholder('Menu Moderativo')
      .addOptions(
        { label: 'Banir usuário', value: 'ban', description: 'Bane o dono do ticket' },
        { label: 'Adicionar usuário no ticket', value: 'add_user', description: 'Libera o acesso de outro usuário' },
        { label: 'Mutar usuário', value: 'punish', description: 'Aplica mute no dono do ticket' },
        { label: 'Blacklist', value: 'blacklist', description: 'Impede novos tickets' }
      )
  );

  container.addActionRowComponents(buttonsRow, staffRow);

  return { components: [container] };
}

async function sendLogMessage(guild, content, files = []) {
  const guildData = await getGuildData(guild.id);
  if (!guildData.logs.channelId) return;

  const channel = guild.channels.cache.get(guildData.logs.channelId)
    || await guild.channels.fetch(guildData.logs.channelId).catch(() => null);

  if (!channel?.isTextBased()) return;

  const payload = buildContainerPayload({
    title: '<:anncio:1526784690911055925> Logs Atendimento Ticket',
    body: content,
    accentColor: guildData.panel.accentColor
  });

  await channel.send({
    ...asV2Message(payload),
    files: files
  }).catch((error) => {
    logger.error('Falha ao enviar log para o canal configurado.', error);
  });
}

async function sendTranscript(guild, transcript, ticket, closedBy) {
  const guildData = await getGuildData(guild.id);

  if (guildData.logs.transcriptChannelId) {
    const transcriptChannel = guild.channels.cache.get(guildData.logs.transcriptChannelId)
      || await guild.channels.fetch(guildData.logs.transcriptChannelId).catch(() => null);

    if (transcriptChannel?.isTextBased()) {
      
      // 1. Tenta buscar o dono do ticket no servidor para pegar o username atualizado
      let ownerName = 'Usuário Desconhecido';
      try {
        const ownerMember = await guild.members.fetch(ticket.ownerId);
        ownerName = ownerMember.user.username;
      } catch {
        // Fallback caso o usuário tenha saído do servidor
        ownerName = ticket.username || `<@${ticket.ownerId}>`;
      }

      // 2. Tenta buscar quem assumiu o ticket para pegar o username
      let staffName = 'Ninguém';
      if (ticket.claimedBy) {
        try {
          const staffMember = await guild.members.fetch(ticket.claimedBy);
          staffName = staffMember.user.username;
        } catch {
          staffName = `ID: ${ticket.claimedBy}`;
        }
      }

      const payload = buildContainerPayload({
        title: 'Transcript HTML gerado.',
        body: [
          `<:n_ticket:1526716703520723014> **Ticket:** <#${ticket.channelId}>`,
          `<:members:1525579493375213700> **Usuário:** ${ownerName}`,
          `<:safety:1525566462406950954> **Quem fechou:** ${closedBy.username}`,
          `<:check:1525566649384702023> **Quem assumiu:** ${staffName}`,
          `<:mensagem:1525579173945671781> **Mensagens totais:** ${transcript.messageCount}`
        ].join('\n'),
        accentColor: guildData.panel.accentColor
      });

      await transcriptChannel.send({
        ...asV2Message(payload),
        files: [transcript.attachment]
      }).catch((error) => {
        logger.error('Falha ao enviar transcript para o canal de logs.', error);
      });
    }
  }

  await sendLogMessage(
    guild,
    `<:prompt:1525566421268955156> Transcript gerado para o ticket <#${ticket.channelId}>. Fechado por ${closedBy.username}.`,
    [transcript.attachment]
  );
}

async function createTicketChannel(client, guild, user, source) {
  const guildData = await getGuildData(guild.id);
  const system = await getSystemData();
  const ticketNumber = await incrementTicketCounter(guild.id);

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  if (system.ownerId) {
    overwrites.push({
      id: system.ownerId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  for (const adminId of guildData.panel.admins) {
    overwrites.push({
      id: adminId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  for (const roleId of [...new Set([...guildData.panel.staffRoles, ...guildData.panel.managerRoles])]) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles
      ]
    });
  }

  const name = `ticket-${user.username}`;

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: guildData.ticket.categoryId || undefined,
    topic: `clicar em 'Fechar Ticket' pra fechar o Ticket`,
    permissionOverwrites: overwrites,
    reason: `Ticket aberto por ${user.tag}`
  });

  await createTicketRecord({
    channelId: channel.id,
    guildId: guild.id,
    ownerId: user.id,
    source: {
      ...source,
      openedFromUserId: user.id
    },
    ticketNumber
  });

  return channel;
}

async function publishPanelToChannel(guild, channel, actor) {
  const guildData = await getGuildData(guild.id);
  const message = await channel.send(asV2Message(buildPublicPanelMessage(guildData)));

  await setLastPanelMessage(guild.id, {
    channelId: channel.id,
    messageId: message.id,
    sentBy: actor.id,
    sentAt: new Date().toISOString()
  });

  await sendLogMessage(guild, `<:safety:1525566462406950954> ${actor.username} publicou o painel de tickets em <#${channel.id}>.`);
  return message;
}

async function notifyUserInTicket(channel, ticket, guildData) {
  const payload = buildContainerPayload({
    title: '<a:white_exclamation:1526717172825718856> Notificação',
    body: `**<@${ticket.ownerId}>, a equipe quer a sua resposta!**`,
    accentColor: guildData.panel.accentColor
  });

  await channel.send(asV2Message(payload, {
    allowedMentions: {
      users: [ticket.ownerId]
    }
  }));
}

async function notifyStaffInTicket(channel, guildData) {
  const target = guildData.panel.pingRoleId ? `<@&${guildData.panel.pingRoleId}>` : '@here';
  const payload = buildContainerPayload({
    title: '<a:white_exclamation:1526717172825718856> Notificação',
    body: `${target} Equipe do servidor chamada. Aguarde.`,
    accentColor: guildData.panel.accentColor
  });

  await channel.send(asV2Message(payload, {
    allowedMentions: {
      parse: guildData.panel.pingRoleId ? [] : ['everyone'],
      roles: guildData.panel.pingRoleId ? [guildData.panel.pingRoleId] : []
    }
  }));
}

async function claimTicket(guild, user, ticket) {
  await sendLogMessage(guild, `<:safety:1525566462406950954> ${user.username} assumiu o ticket <#${ticket.channelId}>.`);
  return updateTicket(ticket.channelId, { claimedBy: user.id });
}

async function closeTicketAndArchive(client, guild, channel, ticket, closedBy) {
  const transcript = await createTranscriptFile(channel, ticket);
  await sendTranscript(guild, transcript, ticket, closedBy);

  await updateTicket(ticket.channelId, {
    status: 'closed',
    closedBy: closedBy.id,
    closedAt: new Date().toISOString()
  });

  await sendLogMessage(guild, `<:n_ticket:1526716703520723014> Ticket <#${ticket.channelId}> sendo encerrado por ${closedBy.username}...`);

  setTimeout(async () => {
    await channel.delete(`<:n_ticket:1526716703520723014> Ticket encerrado por ${closedBy.username}`).catch((error) => {
      logger.error('<:negativobranco:1525565869407736029> Falha ao excluir o canal do ticket:', error);
    });
  }, config.defaults.closeDeleteDelayMs || 5000);
}

module.exports = {
  buildPublicPanelMessage,
  buildTicketMessage,
  createTicketChannel,
  closeTicketAndArchive,
  notifyUserInTicket,
  notifyStaffInTicket,
  claimTicket,
  sendLogMessage,
  publishPanelToChannel
};
