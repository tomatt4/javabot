const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tellonym')
        .setDescription('Abas para envio de Tellonym anônimo ou público.'),

    async execute(interaction) {

        const components = [

            // Imagem no topo
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL('https://i.postimg.cc/vHx6xSgZ/image0.png')
                ),

            // Texto abaixo da imagem
            new TextDisplayBuilder()
                .setContent(
                    '# 📩 Tellonym\n' +
                    'Envie mensagens anônimas ou públicas para outros usuários.\n\n' +
                    'Clique no botão abaixo para começar.'
                ),

            // Botão no final
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_abrir_opcoes_tellonym')
                        .setLabel('Enviar Tellonym')
                        .setStyle(ButtonStyle.Primary)
                )
        ];

        return interaction.reply({
            components,
            flags: MessageFlags.IsComponentsV2
        });
    }
};
