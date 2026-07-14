module.exports = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  bot: {
    status: 'idle',
    activityType: 'Watching',
    activityName: 'bot de ticket'
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
    ownerPasswordSalt: process.env.OWNER_PASSWORD_SALT
  },

  notes: {
    appBio: 'Configure a bio manualmente no Developer Portal.'
  }
};
