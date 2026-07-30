const { SlashCommandBuilder } = require('discord.js');
const { getGuildData } = require('../utils/database');
const { canManagePanel } = require('../utils/permissions');
const { buildHomePanel } = require('../utils/managementPanel');
const { buildContainerPayload, asV2Message } = require('../utils/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Abre o painel central de gerenciamento do bot.'),

    async execute(client, interaction) {
        if (!interaction || !interaction.guild) {
            return interaction?.reply({ 
                content: 'Este comando só pode ser utilizado em um servidor.', 
                ephemeral: true 
            }).catch(() => {});
        }

        // 1. Diz ao Discord para segurar a barra e ganhar tempo (evita o erro)
        await interaction.deferReply({ ephemeral: true });

        try {
            // 2. Faz as consultas normalmente
            const guildData = await getGuildData(interaction.guild.id);

            if (!(await canManagePanel(interaction, guildData))) {
                const payload = buildContainerPayload({
                    title: '<:negativobranco:1525565869407736029> ACESSO NEGADO',
                    body: 'Você não tem permissão para abrir o painel de gerenciamento.',
                    accentColor: guildData?.panel?.accentColor || '#ff0000'
                });

                // 3. Usa editReply em vez de reply por causa do defer
                return interaction.editReply(asV2Message(payload));
            }

            return interaction.editReply(asV2Message(buildHomePanel(guildData, client)));
            
        } catch (error) {
            console.error('Erro ao executar o comando /painel:', error);
            return interaction.editReply({ 
                content: 'Ocorreu um erro ao carregar o painel. Verifique o console.' 
            }).catch(() => {});
        }
    }
}
