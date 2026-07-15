const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  Events
} = require('discord.js');

function createAfkEnabledContainer(user, reason) {
  return new ContainerBuilder()
    .setAccentColor(0xED4245)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          [
            '# 🔴 Status AFK ativado',
            '',
            `${user} agora está AFK.`
          ].join('\n')
        )
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          [
            '### Motivo',
            reason
          ].join('\n')
        )
    );
}

function createAfkRemovedContainer(user, reason, duration = null) {
  const content = [
    '# 🟢 Status AFK removido',
    '',
    `${user} voltou.`,
    '',
    '### Motivo anterior',
    reason
  ];

  if (duration) {
    content.push(
      '',
      '### Tempo ausente',
      duration
    );
  }

  return new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(content.join('\n'))
    );
}

function createAfkWarningContainer(afkDescriptions) {
  return new ContainerBuilder()
    .setAccentColor(0xFEE75C)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          [
            '# ⏱️ Aviso de AFK',
            '',
            ...afkDescriptions
          ].join('\n\n')
        )
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          '-# Esse caba aí tá AFK, macho/macha.'
        )
    );
}

function createErrorContainer(message) {
  return new ContainerBuilder()
    .setAccentColor(0xED4245)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          [
            '# ❌ Não foi possível',
            '',
            message
          ].join('\n')
        )
    );
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];

  if (days > 0) {
    parts.push(`${days} dia${days !== 1 ? 's' : ''}`);
  }

  if (hours > 0) {
    parts.push(`${hours} hora${hours !== 1 ? 's' : ''}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`);
  }

  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} segundo${seconds !== 1 ? 's' : ''}`);
  }

  return parts.join(', ');
}

function initializeAfkSystem(client) {
  if (!client.afkUsers) {
    client.afkUsers = new Map();
  }

  if (client.afkListenerInitialized) {
    return;
  }

  client.afkListenerInitialized = true;

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) {
        return;
      }

      const afkUsers = client.afkUsers;

      /*
       * Remove o AFK automaticamente quando
       * o usuário manda uma mensagem.
       */
      if (afkUsers.has(message.author.id)) {
        const afkData = afkUsers.get(message.author.id);

        afkUsers.delete(message.author.id);

        const duration = formatDuration(
          Date.now() - afkData.since
        );

        const container = createAfkRemovedContainer(
          message.author,
          afkData.reason,
          duration
        );

        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: {
            repliedUser: false
          }
        }).catch(() => null);

        return;
      }

      const mentionedAfkUsers = new Map();

      /*
       * Detecta quando alguém responde à mensagem
       * de uma pessoa que está AFK.
       */
      if (message.reference?.messageId) {
        try {
          const repliedMessage =
            await message.channel.messages.fetch(
              message.reference.messageId
            );

          const repliedUser = repliedMessage.author;

          if (afkUsers.has(repliedUser.id)) {
            mentionedAfkUsers.set(
              repliedUser.id,
              repliedUser
            );
          }
        } catch {
          /*
           * A mensagem respondida pode ter sido
           * apagada ou não estar mais disponível.
           */
        }
      }

      /*
       * Detecta menções diretas a usuários AFK.
       */
      for (
        const mentionedUser
        of message.mentions.users.values()
      ) {
        if (afkUsers.has(mentionedUser.id)) {
          mentionedAfkUsers.set(
            mentionedUser.id,
            mentionedUser
          );
        }
      }

      if (mentionedAfkUsers.size === 0) {
        return;
      }

      const afkDescriptions = [];

      for (
        const [userId, user]
        of mentionedAfkUsers
      ) {
        const afkData = afkUsers.get(userId);

        if (!afkData) {
          continue;
        }

        const afkTimestamp = Math.floor(
          afkData.since / 1000
        );

        afkDescriptions.push(
          [
            `## ${user.username} está AFK`,
            `**Motivo:** ${afkData.reason}`,
            `**Desde:** <t:${afkTimestamp}:R>`
          ].join('\n')
        );
      }

      if (afkDescriptions.length === 0) {
        return;
      }

      const container = createAfkWarningContainer(
        afkDescriptions
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: {
          repliedUser: false,
          users: []
        }
      });
    } catch (error) {
      console.error(
        'Erro no sistema de AFK:',
        error
      );
    }
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Gerencia seu status de AFK.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ativar')
        .setDescription('Define seu status como AFK.')
        .addStringOption((option) =>
          option
            .setName('motivo')
            .setDescription(
              'O motivo da sua ausência.'
            )
            .setRequired(false)
            .setMaxLength(500)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('voltar')
        .setDescription(
          'Remove seu status de AFK.'
        )
    ),

  async execute(client, interaction) {
    initializeAfkSystem(client);

    const subcommand =
      interaction.options.getSubcommand();

    const userId = interaction.user.id;

    if (subcommand === 'ativar') {
      const reason =
        interaction.options.getString('motivo')
        || 'Sem motivo informado.';

      client.afkUsers.set(userId, {
        reason,
        since: Date.now()
      });

      const container = createAfkEnabledContainer(
        interaction.user,
        reason
      );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

      return;
    }

    if (subcommand === 'voltar') {
      if (!client.afkUsers.has(userId)) {
        const container = createErrorContainer(
          'Você não está com o status AFK ativado.'
        );

        await interaction.reply({
          components: [container],
          flags:
            MessageFlags.IsComponentsV2
            | MessageFlags.Ephemeral
        });

        return;
      }

      const afkData =
        client.afkUsers.get(userId);

      client.afkUsers.delete(userId);

      const duration = formatDuration(
        Date.now() - afkData.since
      );

      const container = createAfkRemovedContainer(
        interaction.user,
        afkData.reason,
        duration
      );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
