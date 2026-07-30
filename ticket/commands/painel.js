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
        // Garante que a interação aconteceu em um servidor e que o objeto guild existe
        if (!interaction || !interaction.guild) {
            return interaction?.reply({ 
                content: 'Este comando só pode ser utilizado em um servidor.', 
                ephemeral: true 
            }).catch(() => {});
        }

        // BUSCA OS DADOS DA GUILD AQUI (Essencial para não dar erro nas linhas abaixo)
        const guildData = await getGuildData(interaction.guild.id);

        if (!(await canManagePanel(interaction, guildData))) {
            const payload = buildContainerPayload({
                title: '<:negativobranco:1525565869407736029> ACESSO NEGADO',
                body: 'Você não tem permissão para abrir o painel de gerenciamento.',
                accentColor: guildData.panel.accentColor
            });

            return interaction.reply(asV2Message(payload, { ephemeral: true }));
        }

        return interaction.reply(asV2Message(buildHomePanel(guildData, client), { ephemeral: true }));
    }
}
