const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const path = require("path");

const { buildContainerPayload, asV2Message } = require(path.join(process.cwd(), "utils/ui"));

module.exports = {

    data: new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Tranque um canal")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), 
    
    async execute(interaction) {
        try {

            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });

            const payload = buildContainerPayload({
                title: "<:white_lock:1526828138955280524> Canal Trancado",
                body: [
                    "**Este canal foi trancado.**",
                    `Trancado por: ${interaction.user}`
                ].join('\n'),
                accentColor: 0 
            });

            await interaction.reply(asV2Message(payload));

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `<:negativobranco:1525565869407736029> Ops, algo deu errado ao tentar trancar este canal.`, ephemeral: true });
        }
    }    
};
