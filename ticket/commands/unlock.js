const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const path = require("path");
const { buildContainerPayload, asV2Message } = require(path.join(process.cwd(), "utils/ui"));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Abra um canal")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(client, interaction) {
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });

            const payload = buildContainerPayload({
                title: "Canal Destrancado",
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
                await interaction.followUp({ content: `Algo deu errado ao tentar destrancar este chat.`, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: `Algo deu errado ao tentar destrancar este chat.`, ephemeral: true }).catch(() => {});
            }
        }
    }        
};
