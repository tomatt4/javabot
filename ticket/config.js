module.exports = {
  token: 'token do bot',
  clientId: 'id do bot',
  guildId: 'id do servidor',

  bot: {
    status: 'online',
    activityType: 'Watching',
    activityName: 'by kezzynovo.' 
  },
  defaults: {
    accentColor: 0x2B2D31,
    panelTitle: 'Central de Atendimento',
    panelDescription: 'Escolha uma opção abaixo para abrir seu atendimento.',
    ticketCategoryId: null,
    closeDeleteDelayMs: 5000,
    preventMultipleOpenTickets: true
  },

  transcript: {
    saveToDisk: true,
    folder: './data/transcripts'
  },
  security: {
    ownerPasswordSalt: 'troque-esta-salt-antes-de-usar'
  },
  notes: {
    appBio: 'A bio do aplicativo do bot não pode ser alterada por runtime via discord.js. Defina manualmente no Developer Portal: by kezzynovo.'
  }
};
