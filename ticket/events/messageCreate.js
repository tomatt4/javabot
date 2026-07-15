const { saveMessageToTicket } = require('../utils/database');

module.exports = {
  name: 'messageCreate',
  async execute(message)
    if (!message || !message.author) return;
    if (message.author.bot) return;

    if (!message.channel.name.startsWith('ticket-')) return;

    const messageData = {
      authorId: message.author.id,
      username: message.author.username,
      avatarUrl: message.author.displayAvatarURL({ forceStatic: true }),
      content: message.content || '',
      createdAt: new Date().toISOString(),
      attachments: message.attachments.map(att => ({
        url: att.url,
        name: att.name
      }))
    };

    await saveMessageToTicket(message.channel.id, messageData).catch(err => {
      console.error('Erro ao registrar mensagem do ticket no banco:', err);
    });
  }
};
