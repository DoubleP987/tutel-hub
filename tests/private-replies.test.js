import test from 'node:test';
import assert from 'node:assert/strict';
import { managePrivateReplies, clearPrivateReplies } from '../src/bot/private-replies.js';
const removed = [];
function interaction(id, user = 'user', channel = 'channel') {
  const value = {
    user: { id: user },
    channelId: channel,
    reply: async () => {},
    deferReply: async () => {},
    editReply: async () => {
      value.edited = true;
    },
    followUp: async () => ({ id: id + '-follow' }),
    deleteReply: async () => {
      removed.push(id);
    },
    webhook: {
      deleteMessage: async (messageId) => {
        removed.push(messageId);
      },
    },
  };
  managePrivateReplies(value);
  return value;
}
test('Private responses replace only the same user/channel; public replies survive', async () => {
  removed.length = 0;
  try {
    const first = interaction('first');
    await first.reply({ flags: 64 });
    await interaction('other-user', 'other').reply({ flags: 64 });
    await interaction('other-channel', 'user', 'another').reply({ flags: 64 });
    await interaction('public').reply({ content: 'public' });
    assert.deepEqual(removed, []);
    await interaction('second').deferReply({ flags: 64 });
    assert.deepEqual(removed, ['first']);
    await first.editReply({ content: 'late completion' });
    assert.equal(first.edited, undefined);
  } finally {
    await clearPrivateReplies();
  }
});
test('An ephemeral follow-up deletes its own message, not the public original', async () => {
  removed.length = 0;
  try {
    const original = interaction('public-original');
    await original.reply({ content: 'public' });
    await original.followUp({ flags: 64 });
    await interaction('new').reply({ flags: 64 });
    assert.deepEqual(removed, ['public-original-follow']);
  } finally {
    await clearPrivateReplies();
  }
});
test('An older request completing late cannot delete the newer private response', async () => {
  removed.length = 0;
  try {
    const older = interaction('older');
    const newer = interaction('newer');
    await newer.reply({ flags: 64 });
    await older.deferReply({ flags: 64 });
    assert.deepEqual(removed, ['older']);
  } finally {
    await clearPrivateReplies();
  }
});
