import { t } from '../i18n/bot.js';
import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { clusterEnabled } from '../cluster/state.js';

export async function bot(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  // This operation affects the whole application, not just the current guild.
  await interaction.client.application.fetch();
  const owner = interaction.client.application.owner;
  const owners = new Set([
    owner?.id,
    owner?.ownerId,
    ...(process.env.BOT_CONTROL_USER_IDS || '').split(',').map((id) => id.trim()),
  ]);
  if (!owners.has(interaction.user.id))
    return interaction.editReply(t('คำสั่งนี้ใช้ได้เฉพาะเจ้าของบอทหรือผู้ที่ได้รับอนุญาต'));
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild))
    return interaction.editReply(t('ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์'));
  if (!clusterEnabled()) return interaction.editReply(t('ยังไม่ได้เปิดระบบสลับเครื่อง'));
  const { shutdownLocalNode, setClusterTarget, clusterStatus } = await import(
    '../cluster/runtime.js'
  );
  const command = interaction.options.getSubcommand();
  if (command === 'status') {
    const status = await clusterStatus();
    return interaction.editReply(
      t(
        'เครื่องที่ทำงาน: {0} · โหมด: {1} · เปิดบอท: {2}',
        status.activeNode || t('ไม่มี'),
        status.target,
        status.botEnabled ? t('ใช่') : t('ไม่'),
      ),
    );
  }
  // Acknowledge before a handover closes this Discord client.
  await interaction.editReply(
    command === 'shutdown'
      ? t('กำลังปิดบอทเครื่องนี้และส่งต่อให้อีกเครื่อง')
      : t('กำลังเปลี่ยนเครื่องที่รันบอท'),
  );
  if (command === 'shutdown') await shutdownLocalNode();
  else await setClusterTarget(interaction.options.getString('target', true), true);
}
