const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { checkAndSendAbsencePanel, restoreAbsenceTimers } = require('../commands/absence');
const { restoreVipTimers } = require('../commands/vip');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client, readyClient) {
    logger.info(`Sessão iniciada com ${readyClient.user.tag} (${readyClient.user.id})`);

    // Verifica e envia o painel de ausência automaticamente ao iniciar
    try {
      await checkAndSendAbsencePanel(client);
      await restoreAbsenceTimers(client);
      await restoreVipTimers(client);
    } catch (error) {
      logger.error('Erro ao restaurar ausências:', error);
    }
  },
};