import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
} from 'discord.js';

function fixture() {
  const clock = { now: Date.now() };
  const checks = [];
  const context = {
    console,
    Map,
    Date: { now: () => clock.now },
    randomUUID,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    StringSelectMenuBuilder,
    setting: () => null,
    radioAreas: { all: 'All', bangkok: 'Bangkok' },
    radioCategories: { all: 'All', music: 'Music' },
    t: (text, ...args) => text.replace(/\{(\d+)\}/g, (_, i) => args[i] ?? ''),
    RADIO_STATIONS: Array.from({ length: 21 }, (_, i) => ({
      name: `Station ${i + 1}`,
      url: `https://station.test/${i}`,
      frequency: '',
      region: 'bangkok',
    })),
    getRadioDirectory: async () => [],
    stationMatchesRegion: () => true,
    stationFrequency: () => '',
    radioCategory: () => 'music',
    radioHealthLabels: { online: '🟢 มีเสียง' },
    probeRadio: async (station, options) => {
      checks.push({ station, options });
      return { status: 'online' };
    },
  };
  vm.createContext(context);
  vm.runInContext(
    readFileSync(new URL('../src/commands/radio-list.js', import.meta.url), 'utf8')
      .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
      .replace(/export /g, ''),
    context,
  );
  const bodies = [];
  const interaction = {
    user: { id: 'owner' },
    guildId: 'guild',
    channelId: 'channel',
    options: { getString: () => null, getInteger: () => 1 },
    deferReply: async (options) => {
      interaction.flags = options.flags;
    },
    editReply: async (body) => bodies.push(body),
  };

  const click = (id, user = 'owner') => ({
    customId: id,
    user: { id: user },
    guildId: 'guild',
    channelId: 'channel',
    deferUpdate: async () => {
      interaction.updated = true;
    },
    editReply: async (body) => bodies.push(body),
    reply: async (body) => bodies.push(body),
    followUp: async (body) => bodies.push(body),
  });

  const buttons = () => bodies.at(-1).components[3].toJSON().components;

  return { clock, checks, context, interaction, bodies, click, buttons };
}

test('Radio list is private and buttons update the same list with bounded pages', async () => {
  const f = fixture();
  await f.context.showRadioList(f.interaction);
  assert.equal(f.interaction.flags, MessageFlags.Ephemeral);
  assert(f.bodies[0].content.includes('1/3'));
  assert.equal(f.buttons()[0].disabled, true);
  await f.context.handleRadioListButton(f.click(f.buttons()[1].custom_id));
  assert.equal(f.interaction.updated, true);
  assert(f.bodies[1].content.includes('2/3'));
  await f.context.handleRadioListButton(f.click(f.buttons()[1].custom_id));
  assert(f.bodies[2].content.includes('3/3'));
  assert.equal(f.buttons()[1].disabled, true);
  await f.context.handleRadioListButton(f.click(f.buttons()[0].custom_id));
  assert(f.bodies[3].content.includes('2/3'));
});
test('Radio list refresh probes again and other users or expired sessions cannot navigate', async () => {
  const f = fixture();
  await f.context.showRadioList(f.interaction);
  const refresh = f.buttons()[2].custom_id;
  await f.context.handleRadioListButton(f.click(refresh));
  assert(f.checks.slice(-10).every((check) => check.options.refresh === true));
  await f.context.handleRadioListButton(f.click(refresh, 'someone-else'));
  assert.equal(f.bodies.at(-1).flags, MessageFlags.Ephemeral);
  assert(f.bodies.at(-1).content.includes('หมดอายุ'));
  f.clock.now += 13 * 60000;
  await f.context.handleRadioListButton(f.click(refresh));
  assert(f.bodies.at(-1).content.includes('หมดอายุ'));
});
