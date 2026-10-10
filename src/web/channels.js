import { ChannelType, PermissionFlagsBits } from 'discord.js';

export function canSendReminders(channel, guild) {
  if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
    return false;
  }

  const permissions = channel.permissionsFor(guild.members.me);
  return !!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]);
}

export async function sendableChannels(guild) {
  if (!guild.members.me) {
    await guild.members.fetchMe();
  }

  const channels = await guild.channels.fetch();
  return Array.from(channels.values())
    .filter((c) => canSendReminders(c, guild))
    .map((c) => ({ id: c.id, name: '#' + c.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));
}
