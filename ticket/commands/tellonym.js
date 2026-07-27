const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tellonym')
        .setDescription('Abas para envio de Tellonym anônimo ou público.'),
        
    async execute(interaction) {
        // Garante que só vai executar se for um comando de barra válido
        if (!interaction.isChatInputCommand()) return;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_abrir_opcoes_tellonym')
                .setLabel('Enviar Tellonym')
                .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({
            content: 'Clique no botão abaixo para abrir as opções e enviar o seu Tellonym:',
            components: [row],
            ephemeral: true
        });
    },
};
