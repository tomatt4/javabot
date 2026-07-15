const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const path = require("path");
// Busca o ui.js de forma totalmente segura usando o path
const { buildContainerPayload, asV2Message } = require(path.join(process.cwd(), "utils/ui"));

module.exports = {
    // 1. O seu handler exige a propriedade "data"
    data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Abra um canal")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // Limita o comando para quem gerencia canais direto no Discord

    // 2. O seu handler exige a função "execute"
    async execute(interaction) {
        try {
            // Modifica as permissões do canal para permitir que membros enviem mensagens novamente
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });

            // Monta o visual usando seu Components V2
            const payload = buildContainerPayload({
                title: "<:white_unlock:1526828145972350976> Canal Destrancado",
                body: [
                    "**Esse canal foi destrancado.**",
                    `Destrancado por: ${interaction.user}`
                ].join('\n'),
                accentColor: 0 // Cor preta
            });

            // Responde utilizando o formatador V2 do seu bot
            await interaction.reply(asV2Message(payload));

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `<:negativobranco:1525565869407736029> Ops, algo deu errado ao tentar destrancar este chat.`, ephemeral: true });
        }
    }        
};
