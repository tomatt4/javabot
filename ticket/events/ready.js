const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { checkAndSendAbsencePanel } = require('../handlers/absence'); // Ajuste o caminho se necessário

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client, readyClient) {
    logger.info(`Sessão iniciada com ${readyClient.user.tag} (${readyClient.user.id})`);

    // Verifica e envia o painel de ausência automaticamente ao iniciar
    try {
      await checkAndSendAbsencePanel(client);
    } catch (error) {
      logger.error('Erro ao verificar/enviar o painel de ausência:', error);
    }
  },
};