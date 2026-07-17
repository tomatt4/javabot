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
        `# <:Cosbrletters:1527054372020949055> ticket #${String(ticket.ticketNumber).padStart(4, '0')}`,
        `<:0_bow:1527039332672733216> **usuário:** <@${ticket.ownerId}>`,
        `-# ~~                                                                                  ~~`,
        `<:COScoheedesu:1527041563455258796> **ping:** nenhum por enquanto `,
        `-# ~~                                                                                  ~~`,
        `<:emoji_174:1527054420821540978> **aberto em:** <t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:f>`,
        `-# ~~                                                                                  ~~`,
        `<a:016_choc:1527039252578172958>  **staff que assumiu:** ${ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'ninguém por enquanto.'}`,
        `-# ~~                                                                                  ~~`,
        `**atenção**: usuários abaixo do cargo /ceo devem pedir **permissão** de quem assumiu para interferir no Ticket.`,
        `-# ~~                                                                                  ~~`,
        `**se a equipe demorar demais para te atender**, clique no botão '**notificar equipe**'.`
      ].join('\n')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const buttonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('assumir ticket').setStyle(ButtonStyle.Success).setEmoji('<a:016_choc:1527039252578172958>'),
    new ButtonBuilder().setCustomId('ticket_notify_user').setLabel('notificar usuário').setStyle(ButtonStyle.Secondary).setEmoji('<:043_gingerbread:1527039317472448572>'),
    new ButtonBuilder().setCustomId('ticket_notify_staff').setLabel('notificar equipe').setStyle(ButtonStyle.Secondary).setEmoji('<:COSbroldTV:1527039618300514475>'),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('fechar ticket').setStyle(ButtonStyle.Danger).setEmoji('<:0_bow:1527039332672733216> ')
  );

  const staffRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_staff_panel')
      .setPlaceholder('painel da staff')
      .addOptions(
        { label: 'banir usuário', value: 'ban', description: 'bane o dono do ticket' },
        { label: 'adicionar usuário no ticket', value: 'add_user', description: 'libera o acesso de outro usuário' },
        { label: 'mutar usuário', value: 'punish', description: 'aplica mute no dono do ticket' },
        { label: 'blacklist', value: 'blacklist', description: 'impede novos tickets' }
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
    title: '<:0_bow:1527039332672733216> logs atendimento ticket',
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
        title: '<:COScoheedesu:1527041563455258796> informações de ticket:',
        body: [
          `**ticket:** <#${ticket.channelId}>`,
          `**usuário:** ${ownerName}`,
          `**quem fechou:** ${closedBy.username}`,
          `**quem assumiu:** ${staffName}`,
          `**mensagens totais:** ${transcript.messageCount}`
        ].join('\n'),
        accentColor: guildData.panel.accentColor
      });

      await transcriptChannel.send({
        ...asV2Message(payload),
        files: [transcript.attachment]
      }).catch((error) => {
        logger.error('falha ao enviar transcript para o canal de logs.', error);
      });
    }
  }

  await sendLogMessage(
    guild,
    `<:0_bow:1527039332672733216> transcript gerado para o ticket <#${ticket.channelId}>. fechado por ${closedBy.username}.`,
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
    topic: `clicar em 'fechar ficket' pra fechar o ticket`,
    permissionOverwrites: overwrites,
    reason: `ticket aberto por ${user.tag}`
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

  await sendLogMessage(guild, `<:0_bow:1527039332672733216>  ${actor.username} publicou o painel de tickets em <#${channel.id}>.`);
  return message;
}

async function notifyUserInTicket(channel, ticket, guildData) {
  const payload = buildContainerPayload({
    title: '<:Cosbrletters:1527054372020949055>  notificação',
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
    title: '<:Cosbrletters:1527054372020949055>  notificação',
    body: `${target} equipe do servidor chamada. aguarde.`,
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
  await sendLogMessage(guild, `<:0_bow:1527039332672733216>  ${user.username} assumiu o ticket <#${ticket.channelId}>.`);
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

  await sendLogMessage(guild, `<:0_bow:1527039332672733216> ticket <#${ticket.channelId}> sendo encerrado por ${closedBy.username}...`);

  setTimeout(async () => {
    await channel.delete(`<:0_bow:1527039332672733216> ticket encerrado por ${closedBy.username}`).catch((error) => {
      logger.error('<:negativobranco:1525565869407736029> falha ao excluir o canal do ticket:', error);
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
