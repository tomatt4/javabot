const { Events } = require('discord.js');

const logger = require('../utils/logger');
const {
  getTicketByChannelId,
  updateTicket
} = require('../utils/database');

module.exports = {
  name: Events.ChannelDelete,

  async execute(client, channel) {
    try {
      // Ignora canais que não pertencem a servidores
      if (!channel.guild) return;

      // Verifica se o canal apagado era de um ticket
      const ticket = await getTicketByChannelId(channel.id);

      if (!ticket) return;

      // Se o ticket já estava fechado, não precisa fazer nada
      if (ticket.status === 'closed') return;

      // Marca como fechado no banco
      await updateTicket(channel.id, {
        status: 'closed',
        closedBy: 'SYSTEM',
        closedAt: new Date().toISOString(),
        closeReason: 'Canal do ticket apagado manualmente'
      });

      logger.info(
        `Ticket ${channel.id} foi fechado automaticamente porque o canal foi apagado.`
      );
    } catch (error) {
      logger.error(
        `Erro ao sincronizar ticket do canal apagado ${channel.id}.`,
        error
      );
    }
  }
};
