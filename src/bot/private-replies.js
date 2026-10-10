const latest = new Map();
const replies = new WeakMap();
let sequence = 0;
export const PRIVATE_MENU_TTL_MS = 3 * 60 * 1000;

const privateFlag = (options) =>
  Boolean(options?.ephemeral || Number(options?.flags?.bitfield ?? options?.flags ?? 0) & 64);

export function privateMenuExpired(interaction) {
  const message = interaction.message;
  return Boolean(
    interaction.customId &&
      message?.components?.length &&
      privateFlag(message) &&
      Number.isFinite(message.createdTimestamp) &&
      Date.now() - message.createdTimestamp >= PRIVATE_MENU_TTL_MS,
  );
}

// Ephemeral replies belong to one person in one channel. Keep only their latest
// response, without deleting a public command acknowledgment or another user's reply.
export function managePrivateReplies(
  interaction,
  { privateByDefault = false, isolated = false } = {},
) {
  if (typeof interaction.reply !== 'function' || typeof interaction.deferReply !== 'function') {
    return;
  }

  const order = ++sequence;
  const key = `${interaction.channelId || interaction.guildId || 'dm'}:${interaction.user.id}${isolated ? ':notice:' + order : ''}`;
  let originalPrivate = false;
  const state = { key, order, components: [], pending: false };
  replies.set(interaction, state);

  function replyOptions(options) {
    if (!privateByDefault) {
      return options;
    }

    const body = typeof options === 'string' ? { content: options } : { ...options };
    const flags = Number(body.flags?.bitfield ?? body.flags ?? 0);
    delete body.ephemeral;
    return { ...body, flags: flags | 64 };
  }

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
    // Hard limit from creation: paging or changing filters must not extend it.
    record.timer = setTimeout(async () => {
      if (latest.get(key) !== record) {
        return;
      }

      latest.delete(key);
      await remove().catch(() => {});
    }, PRIVATE_MENU_TTL_MS);
    record.timer.unref?.();
  }

  for (const method of ['reply', 'deferReply']) {
    const original = interaction[method].bind(interaction);

    interaction[method] = async (options) => {
      options = replyOptions(options);
      const result = await original(options); // Acknowledge Discord before cleanup I/O.
      if (privateFlag(options)) {
        originalPrivate = true;
        state.pending = method === 'deferReply';
        state.components = options?.components || [];
        await remember(() => interaction.deleteReply());
      }

      return result;
    };
  }

  const edit = interaction.editReply.bind(interaction);

  interaction.editReply = async (...args) => {
    if (originalPrivate && latest.get(key)?.order > order) {
      return;
    }

    const result = await edit(...args);
    state.pending = false;

    if (args[0]?.components !== undefined) {
      state.components = args[0].components;
    }

    return result;
  };

  const follow = interaction.followUp.bind(interaction);

  interaction.followUp = async (options) => {
    options = replyOptions(options);
    const result = await follow(options);

    if (privateFlag(options)) {
      state.pending = false;
      state.components = options?.components || [];
      await remember(() => interaction.webhook.deleteMessage(result.id));
    }

    return result;
  };
}
// Call after the handler finishes: progress replies must survive slow lookups,
// and interactive menus must remain usable instead of disappearing after 15 s.
export function dismissPrivateReplyLater(interaction) {
  const state = replies.get(interaction);

  if (!state || state.pending || state.components.length) {
    return;
  }

  const record = latest.get(state.key);

  if (!record || record.order !== state.order) {
    return;
  }

  clearTimeout(record.timer);
  record.timer = setTimeout(async () => {
    if (latest.get(state.key) !== record) {
      return;
    }

    latest.delete(state.key);
    await record.remove().catch(() => {});
  }, 15000);
  record.timer.unref?.();
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
