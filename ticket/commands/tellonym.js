const { 
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ContainerBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tellonym')
        .setDescription('Abas para envio de Tellonym anônimo ou público.'),

    async execute(interaction) {

        const container = new ContainerBuilder()
            .setAccentColor(0x393A41);

        // Imagem no topo
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL('https://i.postimg.cc/vHx6xSgZ/image0.png')
                )
        );

        // Texto abaixo da imagem
        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    '# 📩 Tellonym\n' +
                    'Envie mensagens anônimas ou públicas para outros usuários.\n\n' +
                    'Clique no botão abaixo para começar.'
                )
        );

        // Botão
        container.addActionRowComponents(
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_abrir_opcoes_tellonym')
                        .setLabel('Enviar Tellonym')
                        .setStyle(ButtonStyle.Primary)
                )
        );

        return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
