const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const path = require("path");
const { buildContainerPayload, asV2Message } = require(path.join(process.cwd(), "utils/ui"));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Abra um canal")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    // Adicionado "client" como primeiro parâmetro para alinhar com seu handler!
    async execute(client, interaction) {
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });

            const payload = buildContainerPayload({
                title: "<:white_unlock:1526828145972350976> Canal Destrancado",
                body: [
                    "**Esse canal foi destrancado.**",
                    `Destrancado por: ${interaction.user}`
                ].join('\n'),
                accentColor: 0
            });

            await interaction.reply(asV2Message(payload));

        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: `<:negativobranco:1525565869407736029> algo deu errado ao tentar destrancar este chat.`, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: `<:negativobranco:1525565869407736029> Algo deu errado ao tentar destrancar este chat.`, ephemeral: true }).catch(() => {});
            }
        }
    }        
};
