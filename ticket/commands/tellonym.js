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
            .setAccentColor(0x000000);

        // Texto
        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    '# 📩 Tellonym Celestia\n' +
                    'Bem vindo ao sistema de **Tellonym** da Celestia! O Tellonym foi criado no intuito de trazer entretenimento e diversão pro servidor, com você podendo enviar mensagens **anônimas** ou **públicas**!\n\n' +
                    'Qualquer pergunta, abra Ticket. Clique no botão abaixo para começar!'
                )
        );
                
        // Imagem no meio
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL('https://i.postimg.cc/L6vffCPV/Chat-GPT-Image-6-de-ago-de-2026-21-49-55.png')
                )
        );

        // Botão abaixo da imagem
        container.addActionRowComponents(
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_abrir_opcoes_tellonym')
                        .setLabel('Enviar um Tellonym')
                        .setStyle(ButtonStyle.Secondary)
                )
        );

        return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
