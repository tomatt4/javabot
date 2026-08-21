module.exports = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  bot: {
    status: 'online',
    activityType: 'Watching',
    activityName: '.gg/cruel'
  },

  defaults: {
    accentColor: 0x2B2D31,
    panelTitle: 'Central de Atendimento',
    panelDescription: 'Escolha uma opção abaixo para abrir seu atendimento.',
    ticketCategoryId: null,
    closeDeleteDelayMs: 5000,
    preventMultipleOpenTickets: true,
    newMemberSuggestions: [
      'Leia as regras do servidor e confira os canais importantes.',
      'Apresente-se para a comunidade e conte um pouco sobre você.',
      'Confira os canais de ajuda caso precise falar com a equipe.',
      'Explore os canais do servidor para encontrar as atividades da comunidade.'
    ]
  },

  transcript: {
    saveToDisk: true,
    folder: 'ticket/data/transcripts'
  },

  security: {
    ownerPasswordSalt: process.env.OWNER_PASSWORD_SALT
  },

  notes: {
    appBio: 'Configure a bio manualmente no Developer Portal.'
  }
};
