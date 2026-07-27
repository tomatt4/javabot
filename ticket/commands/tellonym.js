const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    TextDisplayBuilder, 
    MessageFlags 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tellonym')
        .setDescription('Abas para envio de Tellonym anônimo ou público.'),
        
    async execute(interaction) {
        const componentesOpcoesV2 = [
            new TextDisplayBuilder().setContent('# 📩 Tellonym\nClique no botão abaixo para abrir as opções e enviar a sua mensagem.'),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_abrir_opcoes_tellonym')
                    .setLabel('Enviar Tellonym')
                    .setStyle(ButtonStyle.Primary)
            )
        ];

        return interaction.reply({ 
            components: componentesOpcoesV2, 
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
