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

    async execute(client, interaction) {

        const container = new ContainerBuilder()
            .setAccentColor(0x000000);

        // Texto
        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    '# 📩 Tellonym Cruel\n' +
                    'Boas vindas ao **Sistema de Tellonym**! Aqui você pode mandar mensagens tanto Públicas quanto **Anônimas** no Cruel, podendo se confessar, desabafar sem ninguém saber que é você e entre outros. Não tem uma maneira específica para usar, use o Tellonym por vontade própria(**desde que não viole as regras do servidor**)!\n\n' +
                    '**Importante:** Qualquer Tellonym que tenha conteúdo inadequado, discurso de ódio ou xingamentos excessivos à alguém, se lembre, **os Tellonyns anônimos são enviados aos Logs da staff para revisão.**\n' +
                    'Mas não se preocupe, qualquer staff que exibir o Tellonym anônimos a todo como forma de zoação receberá um aviso dos superiores, e em casos extremos, remoção permanente da staff. (Clique no botão abaixo para enviar um Tellonym)'
                )
        );

        // Botão
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
