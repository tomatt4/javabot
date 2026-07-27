const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ContainerBuilder,
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
        const container = new ContainerBuilder();
        container.setAccentColor(0x5865F2);
        container.addComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL('https://i.postimg.cc/vHx6xSgZ/image0.png')
                ),
            new TextDisplayBuilder()
                .setContent(
                    '# 📩 Tellonym CDV\n' +
                    'Clique no botão abaixo para abrir as opções e enviar sua mensagem.'
                )
        );

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_abrir_opcoes_tellonym')
                    .setLabel('Enviar Tellonym')
                    .setStyle(ButtonStyle.Primary)
            );

        return interaction.reply({
            components: [container, actionRow],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
