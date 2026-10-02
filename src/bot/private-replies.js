const latest = new Map();
let sequence = 0;
const privateFlag = (options) =>
  Boolean(options?.ephemeral || Number(options?.flags?.bitfield ?? options?.flags ?? 0) & 64);

// Ephemeral replies belong to one person in one channel. Keep only their latest
// response, without deleting a public command acknowledgment or another user's reply.
export function managePrivateReplies(interaction) {
  if (typeof interaction.reply !== 'function' || typeof interaction.deferReply !== 'function')
    return;
  const key = `${interaction.channelId || interaction.guildId || 'dm'}:${interaction.user.id}`;
  const order = ++sequence;
  let originalPrivate = false;
  async function remember(remove) {
    const previous = latest.get(key);
    if (previous?.order > order) {
      await remove().catch(() => {});
      return;
    }
    const record = { order, remove, timer: null };
    latest.set(key, record);
    if (previous) {
      clearTimeout(previous.timer);
      await previous.remove().catch(() => {});
    }
    // Clean up while the interaction webhook is still valid (15 minutes).
    record.timer = setTimeout(
      async () => {
        if (latest.get(key) !== record) return;
        latest.delete(key);
        await remove().catch(() => {});
      },
      14 * 60 * 1000,
    );
    record.timer.unref?.();
  }
  for (const method of ['reply', 'deferReply']) {
    const original = interaction[method].bind(interaction);
    interaction[method] = async (options) => {
      const result = await original(options); // Acknowledge Discord before cleanup I/O.
      if (privateFlag(options)) {
        originalPrivate = true;
        await remember(() => interaction.deleteReply());
      }
      return result;
    };
  }
  const edit = interaction.editReply.bind(interaction);
  interaction.editReply = async (...args) => {
    if (originalPrivate && latest.get(key)?.order > order) return;
    return edit(...args);
  };
  const follow = interaction.followUp.bind(interaction);
  interaction.followUp = async (options) => {
    const result = await follow(options);
    if (privateFlag(options)) await remember(() => interaction.webhook.deleteMessage(result.id));
    return result;
  };
}
export async function clearPrivateReplies() {
  const records = [...latest.values()];
  latest.clear();
  await Promise.all(
    records.map(async (record) => {
      clearTimeout(record.timer);
      await record.remove().catch(() => {});
    }),
  );
}
