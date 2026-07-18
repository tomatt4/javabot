async function executarTomate(ctx, targetUser) {
    
    const { member, channel, replyFn } = ctx;
    const cooldownTime = getCooldown(member);

    // Verificação de Cooldown
    if (cooldownTime > 0) {
        const lastUsed = cooldowns.get(member.id);
        if (lastUsed && (Date.now() - lastUsed) < cooldownTime) {
            const remaining = (cooldownTime - (Date.now() - lastUsed)) / 1000;
            const minutes = Math.floor(remaining / 60);
            const seconds = Math.floor(remaining % 60);
            return await replyFn(`⏳ cooldown ativo. espere **${minutes}**m **${seconds}**s`);
        }
        cooldowns.set(member.id, Date.now());
    }

    // Busca de mensagens
    const messages = await channel.messages.fetch({ limit: 5 });
    const filtered = messages.filter(m => !m.author.bot && (!targetUser || m.author.id === targetUser.id));

    if (filtered.size === 0) {
        return await replyFn(targetUser ? `não achei mensagem de ${targetUser} pra tacar tomate` : "não achei mensagem pra tacar tomate");
    }

    const selectedMsg = filtered.random();
    const target = selectedMsg.author;

    // Proteção Staff/Owner
    if (isStaff(target) || isOwner(target)) {
        try {
            await selectedMsg.react("🍅");
            return await replyFn("taquei tomate em um dos staffs do servidor, fudeu");
        } catch (e) {
            return await replyFn("não tenho permissão pra reagir mensagens pô");
        }
    }

    // Sorteio 
    const chance = Math.floor(Math.random() * 100) + 1;
    
    if (chance <= 35) {
        return await replyFn(`**RARO**(**CHANCE: 35%**): <@${target.id}> desviou do tomate`);
    } else if (chance <= 45) {
        return await replyFn(`**SUPER RARO**(**CHANCE: 10%**): <@${target.id}> deu parry e jogou de volta em <@${member.id}>`);
    } else if (chance <= 50) {
        return await replyFn(`**ULTRA RARO**(**CHANCE: 5%**): <@${target.id}> puxou uma KATANA e cortou o tomate AO MEIO no AR.`);
    } else if (chance <= 75) {
        return await replyFn("errei o tomate kkkkkkkkkkkkkkkkkkkkj depois eu tento de novo");
    } else {
        try {
            await selectedMsg.react("🍅");
            const msg = (target.id === member.id) 
                ? `<@${member.id}> tentou jogar um tomate e acabou acertando a si mesmo KKKKKKKKKKKKKKKKKKKKKKKK` 
                : `<@${target.id}> foi atingido pelo tomate`;
            return await replyFn(msg);
        } catch (e) {
            return await replyFn("não tenho permissão pra reagir mensagens);
        }
    }
}
