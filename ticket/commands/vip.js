const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { query } = require('../utils/database');

const VIP_MANAGER_ROLE_ID = '1532532641646247946';
const VIP_LOG_CHANNEL_ID = '1540024049206300803';
const MAX_TIMEOUT_MS = 2_147_483_647;

function scheduleVipExpiration(client, assignment) {
  const target = assignment.status === 'active'
    ? new Date(assignment.expires_at).getTime()
    : new Date(assignment.decision_deadline).getTime();
  const remainingMs = target - Date.now();
  const delay = Math.max(0, Math.min(remainingMs, MAX_TIMEOUT_MS));

  setTimeout(async () => {
    try {
      if (remainingMs > MAX_TIMEOUT_MS) return scheduleVipExpiration(client, assignment);
      if (assignment.status === 'active') await notifyVipExpiration(client, assignment);
      else await removeExpiredVip(client, assignment);
    } catch (error) {
      console.error('Erro ao processar expiração do VIP:', error);
    }
  }, delay);
}

async function notifyVipExpiration(client, assignment) {
  const result = await query(
    `UPDATE vip_assignments SET status = 'pending', notified_at = NOW(), decision_deadline = NOW() + INTERVAL '5 days' WHERE id = $1 AND status = 'active' RETURNING *`,
    [assignment.id]
  );
  if (!result.rows[0]) return;

  const current = result.rows[0];
  scheduleVipExpiration(client, current);
  const channel = await client.channels.fetch(VIP_LOG_CHANNEL_ID).catch(() => null);
  if (!channel) return;
  await channel.send({
    content: `O VIP de <@${current.user_id}> expirou. Escolha uma opção:`,
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`vip_paid:${current.id}`).setLabel('Pagou').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`vip_not_paid:${current.id}`).setLabel('Não pagou').setStyle(ButtonStyle.Danger)
    )],
    allowedMentions: { users: [current.user_id] }
  });
}

async function removeExpiredVip(client, assignment) {
  const result = await query(
    `UPDATE vip_assignments SET status = 'removed', removed_at = NOW() WHERE id = $1 AND status = 'pending' AND decision_deadline <= NOW() RETURNING *`,
    [assignment.id]
  );
  if (result.rows[0]) await removeVipRole(client, result.rows[0], true);
}

async function removeVipRole(client, assignment, announce) {
  const guild = await client.guilds.fetch(assignment.guild_id).catch(() => null);
  const member = await guild?.members.fetch(assignment.user_id).catch(() => null);
  await member?.roles.remove(assignment.role_id, 'VIP expirado sem confirmação de pagamento').catch(() => null);
  if (announce) {
    const channel = await client.channels.fetch(VIP_LOG_CHANNEL_ID).catch(() => null);
    await channel?.send(`cargo retirado com sucesso. <@${assignment.user_id}>`).catch(() => null);
  }
}

async function handleVipInteraction(interaction) {
  const [action, idText] = interaction.customId.split(':');
  if (!['vip_paid', 'vip_not_paid'].includes(action)) return false;
  if (!interaction.member.roles.cache.has(VIP_MANAGER_ROLE_ID)) {
    await interaction.reply({ content: 'Você não tem permissão para processar este VIP.', ephemeral: true });
    return true;
  }

  const id = Number(idText);
  if (!Number.isInteger(id)) return true;
  const result = await query(
    `UPDATE vip_assignments SET status = $2, removed_at = CASE WHEN $2 = 'removed' THEN NOW() ELSE removed_at END WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id, action === 'vip_paid' ? 'paid' : 'removed']
  );
  if (!result.rows[0]) {
    await interaction.reply({ content: 'Este VIP já foi processado.', ephemeral: true });
    return true;
  }

  if (action === 'vip_not_paid') await removeVipRole(interaction.client, result.rows[0], false);
  await interaction.update({ content: action === 'vip_not_paid' ? 'cargo retirado com sucesso.' : interaction.message.content, components: [] });
  return true;
}

async function restoreVipTimers(client) {
  const result = await query(`SELECT * FROM vip_assignments WHERE status IN ('active', 'pending') ORDER BY expires_at ASC`);
  for (const assignment of result.rows) scheduleVipExpiration(client, assignment);
}

module.exports = { VIP_MANAGER_ROLE_ID, restoreVipTimers, scheduleVipExpiration, handleVipInteraction };