const Discord = require("discord.js");
// Importa os builders do Components V2 e o renderizador do seu sistema de UI
const { ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { buildContainerPayload, asV2Message } = require("../../ticket/utils/ui"); // Ajuste o caminho relativo até o seu arquivo ui.js se necessário

module.exports = {
    name: "lock",
    description: "Tranque um canal",
    type: Discord.ApplicationCommandType.ChatInput,

    run: async (client, interaction) => {
        // Verifica se o usuário tem a permissão de Gerenciar Canais
        if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: `<:negativobranco:1525565869407736029> | Você não possui a permissão \`Gerenciar Canais\` para usar este comando.`, ephemeral: true });
        }

        try {
            // Modifica as permissões do canal para que membros não possam mais enviar mensagens
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });

            // Monta o visual usando Components V2
            const payload = buildContainerPayload({
                title: "<:white_lock:1526828145972350976> Canal Trancado",
                body: [
                    "**Este canal foi trancado.**",
                    `Trancado por: ${interaction.user}`
                ].join('\n'),
                accentColor: "#000000" // Mantém a cor preta
            });

            // Responde utilizando o formatador V2 do seu bot
            await interaction.reply(asV2Message(payload));

        } catch (error) {
            console.log(error);
            interaction.reply({ content: `<:white_lock:1526828145972350976> | Ocorreu um erro ao tentar trancar este canal.`, ephemeral: true });
        }
    }    
};
