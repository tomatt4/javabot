const Discord = require("discord.js");
// Importa os builders do Components V2 e o renderizador do seu sistema de UI
const { ContainerBuilder, TextDisplayBuilder } = require("discord.js"); 
const { buildContainerPayload, asV2Message } = require("../../ticket/utils/ui"); // Ajuste o caminho relativo até o seu arquivo ui.js se necessário

module.exports = {
    name: "unlock", 
    description: "Abra um canal.",
    type: Discord.ApplicationCommandType.ChatInput,
    
    run: async (client, interaction) => {
        // Verifica se o usuário tem a permissão de Gerenciar Canais
        if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: `<:negativobranco:1525565869407736029> | Você não possui a permissão \`Gerenciar Canais\` para usar este comando.`, ephemeral: true });
        }

        try {
            // Modifica as permissões do canal para permitir que membros enviem mensagens novamente
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });

            // Monta o visual usando Components V2
            const payload = buildContainerPayload({
                title: "<:white_unlock:1526828145972350976>Canal Destrancado",
                body: [
                    "**Esse canal foi destrancado.**",
                    `Destrancado por: ${interaction.user}`
                ].join('\n'),
                accentColor: "0" // Mantém a cor preta
            });

            // Responde utilizando o formatador V2 do seu bot
            await interaction.reply(asV2Message(payload));

        } catch (error) {
            console.log(error);
            interaction.reply({ content: `❌ | Ops, algo deu errado ao tentar destrancar este chat.`, ephemeral: true });
        }
    }        
};
