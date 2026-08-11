const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const path = require("path");
const { buildContainerPayload, asV2Message } = require(path.join(process.cwd(), "utils/ui"));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Tranque um canal")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    // Adicionado "client" como primeiro parâmetro para alinhar com seu handler!
    async execute(client, interaction) {
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });

            const payload = buildContainerPayload({
                title: "Canal Trancado",
                body: [
                    "**Este canal foi trancado.**",
                    `Trancado por: ${interaction.user}`
                ].join('\n'),
                accentColor: 0
            });

            await interaction.reply(asV2Message(payload));

        } catch (error) {
            console.error(error);
            // Evita quebrar caso ocorra algum erro antes de responder
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: `Algo deu errado ao tentar trancar este canal.`, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: `Algo deu errado ao tentar trancar este canal.`, ephemeral: true }).catch(() => {});
            }
        }
    }    
};
