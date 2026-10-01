export const duration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m) + ':' + String(s).padStart(2, '0');
};
export const guildOnly = (interaction) => {
  if (!interaction.guild) {
    interaction.reply({ content: 'คำสั่งนี้ใช้ได้ใน server เท่านั้น', ephemeral: true });
    return false;
  }
  return true;
};
