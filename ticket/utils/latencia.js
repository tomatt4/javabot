const {SlashCommandBuilder}=require('discord.js');module.exports={data:new SlashCommandBuilder().setName('sohakari').setDescription('so hakari'),async execute(c,i){await i.reply('so hakari');}};
