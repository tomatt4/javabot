const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    TextDisplayBuilder,
    MediaGalleryBuilder // Usado para a imagem gigante de banner
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tellonym')
        .setDescription('Envia o painel Tellonym (Components V2).'),
        
    async execute(interaction) {
        
        // Em Components V2, a mensagem é um array de componentes estruturados
        const componentesV2 = [
            // 1. O banner do topo
            new MediaGalleryBuilder().addMedia({ url: '' }),
            
            // 2. O Título e a Descrição nativa do Discord (suporta Markdown)
            new TextDisplayBuilder().setContent('# Envie um Tellonym\nEnvie mensagens anônimas para alguém do servidor.\n*Mensagens contendo fofocas, ofensas, xingamentos ou discurso de ódio não serão postadas.*'),
            
            // 3. O Botão
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_abrir_opcoes_tellonym')
                    .setLabel('Enviar Tellonym')
                    .setStyle(ButtonStyle.Secondary)
            )
        ];

        // O segredo está aqui: A flag IsComponentsV2 avisa a API que essa é a nova estrutura
        await interaction.reply({ 
            components: componentesV2, 
            flags: MessageFlags.IsComponentsV2 
        });
    }
};
