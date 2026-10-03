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

test('Music and radio default-private replies preserve content and keep only the latest response', async () => {
  const sent = [];
  const deleted = [];
  function command(id) {
    const value = {
      user: { id: 'private-user' },
      channelId: 'private-channel',
      reply: async (body) => sent.push(body),
      deferReply: async (body) => sent.push(body),
      editReply: async () => {},
      followUp: async (body) => {
        sent.push(body);
        return { id: id + '-follow' };
      },
      deleteReply: async () => deleted.push(id),
      webhook: { deleteMessage: async (messageId) => deleted.push(messageId) },
    };
    managePrivateReplies(value, { privateByDefault: true });
    return value;
  }
  try {
    await command('radio').reply('Multiple stations found');
    await command('random').deferReply();
    await command('stop').reply({
      content: 'Stopped',
      flags: 4096,
      allowedMentions: { parse: [] },
    });
    assert.equal(sent[0].content, 'Multiple stations found');
    assert.equal(sent[0].flags, 64);
    assert.equal(sent[1].flags, 64);
    assert.equal(sent[2].flags, 4096 | 64);
    assert.deepEqual(sent[2].allowedMentions, { parse: [] });
    assert.deepEqual(deleted, ['radio', 'random']);
  } finally {
    await clearPrivateReplies();
  }
});
