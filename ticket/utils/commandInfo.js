function requireGuild(interaction) {
  if (interaction.guild) return true;

  interaction.reply({
    content: 'Este comando só pode ser utilizado em um servidor.',
    ephemeral: true
  });
  return false;
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, totalSeconds);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  if (minutes || hours || days) parts.push(`${minutes}min`);
  parts.push(`${remainingSeconds}s`);
  return parts.join(' ');
}

function formatDate(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

module.exports = { requireGuild, formatNumber, formatDuration, formatDate };